/**
 * WhatsApp conversation search — single server-side path.
 *
 *   result set = inboxVisibility(user) AND (phone | name | notes | message body)
 *
 * The visibility filter is the same one the inbox list uses, and the search
 * predicate is always ANDed in (never assigned onto a visibility `$or`), so a
 * user can never find a chat they could not open.
 */

import type { Types } from "mongoose";
import ConversationArchiveState from "@/models/conversationArchiveState";
import WhatsAppConversation from "@/models/whatsappConversation";
import WhatsAppMessage from "@/models/whatsappMessage";
import { FULL_ACCESS_ROLES } from "@/lib/whatsapp/config";
import { buildInboxListQueryAsync } from "@/lib/whatsapp/inboxQuery";
import { findLeadByPhoneOrEmail } from "@/lib/whatsapp/leadLookupService";
import { andMerge, isDenyAllFilter, type MongoFilter } from "@/lib/whatsapp/mongoMerge";
import { canAccessWhatsAppAdminQueue } from "@/lib/whatsapp/participantLocationPrivileges";
import type { WhatsAppToken } from "@/lib/whatsapp/apiContext";
import { getUserAreasFromToken, locationKeyFromDisplay, normalizeAreas } from "@/lib/whatsapp/areaTokenUtils";
import {
  buildInboxContactSearchClause,
  classifyPhoneMatch,
  isPhoneQuery,
  normalizePhoneSearchDigits,
  type PhoneMatchType,
} from "@/lib/whatsapp/searchUtils";
import {
  extractMessageSnippet,
  generateMatchContext,
  highlightSearchTerm,
  type StartNewChatInfo,
  type UnifiedConversationResult,
  type UnifiedSearchMatch,
} from "@/lib/whatsapp/unifiedSearchUtils";

const CONTACT_SEARCH_TIMEOUT_MS = 3000;
const MESSAGE_SEARCH_TIMEOUT_MS = 2500;
/** Contact candidates fetched (newest first) before in-memory ranking. */
const CONTACT_CANDIDATE_CAP = 200;
/** Most recent visible conversations whose messages are scanned. */
const MESSAGE_SCOPE_CAP = 2000;
const MESSAGE_RAW_CAP = 150;
const MESSAGE_MIN_QUERY_LENGTH = 3;
const MAX_MESSAGES_PER_CONVERSATION = 3;
const MIN_START_CHAT_DIGITS = 7;

export const MAX_SEARCH_RESULTS = 50;

type SnippetMessage = UnifiedSearchMatch["matchedMessages"][number];

type ConversationLean = {
  _id: Types.ObjectId;
  participantPhone: string;
  participantName?: string;
  participantProfilePic?: string;
  lastMessageContent?: string;
  lastMessageTime: Date;
  unreadCount?: number;
  conversationType?: "owner" | "guest";
  assignedAgent?: unknown;
  status?: string;
  notes?: string;
};

type MessageLean = {
  _id?: { toString(): string };
  messageId?: string;
  content?: { text?: string; caption?: string };
  timestamp: Date;
  direction: "incoming" | "outgoing";
  mediaUrl?: string;
};

const CONVERSATION_SELECT =
  "participantPhone participantName participantProfilePic lastMessageContent lastMessageTime unreadCount conversationType assignedAgent status notes";

export type ConversationSearchOutcome = {
  conversations: UnifiedConversationResult[];
  startNewChat?: StartNewChatInfo;
  messageSearchIncomplete: boolean;
  scopeTruncated: boolean;
};

function toSnippetMessage(msg: MessageLean, query: string): SnippetMessage {
  const text = msg.content?.text || msg.content?.caption || "";
  return {
    messageId: msg.messageId || msg._id?.toString() || "",
    snippet: highlightSearchTerm(extractMessageSnippet(text, query), query),
    timestamp: msg.timestamp,
    direction: msg.direction,
    mediaUrl: msg.mediaUrl,
  };
}

function assignedAgentToString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  return value ? String(value) : undefined;
}

/**
 * Visibility for global search: the normal inbox scope, plus the Admin Queue
 * scope for users who are allowed to open it. Never wider than what the user may open.
 */
export async function buildSearchVisibilityFilter(user: WhatsAppToken): Promise<MongoFilter> {
  const base = await buildInboxListQueryAsync(user, { status: "active" });
  const isFullAccess = (FULL_ACCESS_ROLES as readonly string[]).includes(user.role || "");

  if (isFullAccess || !canAccessWhatsAppAdminQueue(user)) return base;

  const queue = await buildInboxListQueryAsync(user, { status: "active", adminQueue: true });
  if (isDenyAllFilter(queue)) return base;
  if (isDenyAllFilter(base)) return queue;
  return { $or: [base, queue] };
}

type RankedContact = {
  conv: ConversationLean;
  phoneMatch?: PhoneMatchType;
  nameMatch: boolean;
  notesMatch: boolean;
  score: number;
};

function rankContacts(
  rows: ConversationLean[],
  query: string,
  isPhone: boolean,
): RankedContact[] {
  const needle = query.toLowerCase();
  const ranked = rows.map((conv): RankedContact => {
    const phoneMatch = isPhone ? classifyPhoneMatch(conv.participantPhone, query) : undefined;
    const nameMatch = (conv.participantName || "").toLowerCase().includes(needle);
    const notesMatch = (conv.notes || "").toLowerCase().includes(needle);
    const score =
      (phoneMatch === "exact" ? 100 : phoneMatch === "suffix" ? 50 : phoneMatch === "contains" ? 30 : 0) +
      (nameMatch ? 40 : 0) +
      (notesMatch ? 5 : 0);
    return { conv, phoneMatch, nameMatch, notesMatch, score };
  });

  return ranked
    .filter((r) => r.phoneMatch || r.nameMatch || r.notesMatch)
    .sort(
      (a, b) =>
        b.score - a.score ||
        new Date(b.conv.lastMessageTime).getTime() - new Date(a.conv.lastMessageTime).getTime(),
    );
}

function toResult(ranked: RankedContact, query: string): UnifiedConversationResult {
  const { conv, phoneMatch, nameMatch, notesMatch, score } = ranked;
  const matches: UnifiedSearchMatch = {
    matchedInPhone: Boolean(phoneMatch),
    phoneMatchType: phoneMatch,
    phoneMatchedText: phoneMatch ? conv.participantPhone : undefined,
    matchedInName: nameMatch,
    nameMatchedText: nameMatch ? highlightSearchTerm(conv.participantName || "", query) : undefined,
    matchedInNotes: notesMatch,
    notesSnippet: notesMatch ? "Found in notes" : undefined,
    matchedMessages: [],
    totalMessageMatches: 0,
    relevanceScore: score,
  };
  return {
    conversationId: String(conv._id),
    participantPhone: conv.participantPhone,
    participantName: conv.participantName || "",
    participantProfilePic: conv.participantProfilePic,
    lastMessageContent: conv.lastMessageContent,
    lastMessageTime: conv.lastMessageTime,
    unreadCount: conv.unreadCount || 0,
    conversationType: conv.conversationType,
    assignedAgent: assignedAgentToString(conv.assignedAgent),
    status: conv.status,
    matches,
    matchContext: generateMatchContext(matches, query),
  };
}

type MessageSearchOutcome = {
  hitsByConversation: Map<string, SnippetMessage[]>;
  incomplete: boolean;
  scopeTruncated: boolean;
};

/**
 * Message-body search restricted to conversations the user can see.
 * The visible id set is resolved first, so the raw cap cannot be consumed by
 * chats the user is not allowed to open.
 */
async function searchMessageBodies(
  visibility: MongoFilter,
  query: string,
  escapedQuery: string,
): Promise<MessageSearchOutcome> {
  const empty: MessageSearchOutcome = {
    hitsByConversation: new Map(),
    incomplete: false,
    scopeTruncated: false,
  };

  try {
    const scope = await WhatsAppConversation.find(visibility)
      .sort({ lastMessageTime: -1 })
      .limit(MESSAGE_SCOPE_CAP)
      .select("_id")
      .maxTimeMS(MESSAGE_SEARCH_TIMEOUT_MS)
      .lean<Array<{ _id: Types.ObjectId }>>();

    if (scope.length === 0) return empty;

    const grouped = await WhatsAppMessage.aggregate<{ _id: Types.ObjectId; messages: MessageLean[] }>([
      {
        $match: {
          conversationId: { $in: scope.map((row) => row._id) },
          type: { $nin: ["reaction", "system"] },
          $or: [
            { "content.text": { $regex: escapedQuery, $options: "i" } },
            { "content.caption": { $regex: escapedQuery, $options: "i" } },
          ],
        },
      },
      { $sort: { timestamp: -1 } },
      { $limit: MESSAGE_RAW_CAP },
      {
        $group: {
          _id: "$conversationId",
          messages: {
            $push: {
              _id: "$_id",
              messageId: "$messageId",
              content: "$content",
              timestamp: "$timestamp",
              direction: "$direction",
              mediaUrl: "$mediaUrl",
            },
          },
        },
      },
    ])
      .option({ maxTimeMS: MESSAGE_SEARCH_TIMEOUT_MS })
      .exec();

    const hitsByConversation = new Map<string, SnippetMessage[]>();
    for (const group of grouped) {
      const snippets = group.messages
        .slice(0, MAX_MESSAGES_PER_CONVERSATION)
        .map((msg) => toSnippetMessage(msg, query))
        .filter((msg) => msg.messageId);
      if (snippets.length > 0) hitsByConversation.set(String(group._id), snippets);
    }

    return {
      hitsByConversation,
      incomplete: false,
      scopeTruncated: scope.length >= MESSAGE_SCOPE_CAP,
    };
  } catch (error) {
    console.error("[whatsapp/search] message search failed:", error);
    return { ...empty, incomplete: true };
  }
}

async function loadArchivedIds(ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const rows = await ConversationArchiveState.find({
    conversationId: { $in: ids },
    isArchived: true,
  })
    .select("conversationId")
    .lean<Array<{ conversationId: Types.ObjectId }>>();
  return new Set(rows.map((row) => String(row.conversationId)));
}

function leadLocationInScope(user: WhatsAppToken, leadLocation: string | undefined): boolean {
  const role = user.role || "";
  if ((FULL_ACCESS_ROLES as readonly string[]).includes(role)) return true;
  if (!leadLocation?.trim()) return false;
  const areas = normalizeAreas(getUserAreasFromToken(user));
  // Unallocated Sales/LeadGen roles are not location-restricted (mirrors visibility rules).
  if (areas.length === 0) return true;
  return areas.includes(locationKeyFromDisplay(leadLocation));
}

async function resolveStartNewChat(
  user: WhatsAppToken,
  query: string,
): Promise<StartNewChatInfo | undefined> {
  const digits = normalizePhoneSearchDigits(query);
  if (digits.length < MIN_START_CHAT_DIGITS) return undefined;

  const lead = await findLeadByPhoneOrEmail({ phone: digits }).catch(() => null);
  const leadLocation = lead?.location?.trim() || undefined;
  const isFullAccess = (FULL_ACCESS_ROLES as readonly string[]).includes(user.role || "");

  // Staff may only start chats for leads inside their allotted location.
  if (!isFullAccess && !(lead && leadLocationInScope(user, leadLocation))) return undefined;

  return { phone: digits, leadName: lead?.name?.trim() || undefined, leadLocation };
}

export async function searchConversations(params: {
  user: WhatsAppToken;
  query: string;
  limit: number;
}): Promise<ConversationSearchOutcome> {
  const { user } = params;
  const query = params.query.trim();
  const limit = Math.min(params.limit, MAX_SEARCH_RESULTS);
  const isPhone = isPhoneQuery(query);

  const visibility = await buildSearchVisibilityFilter(user);
  if (isDenyAllFilter(visibility)) {
    return { conversations: [], messageSearchIncomplete: false, scopeTruncated: false };
  }

  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const searchMessages = !isPhone && query.length >= MESSAGE_MIN_QUERY_LENGTH;

  const [candidates, messageOutcome] = await Promise.all([
    WhatsAppConversation.find(andMerge(visibility, buildInboxContactSearchClause(query)))
      .sort({ lastMessageTime: -1 })
      .limit(CONTACT_CANDIDATE_CAP)
      .select(CONVERSATION_SELECT)
      .maxTimeMS(CONTACT_SEARCH_TIMEOUT_MS)
      .lean<ConversationLean[]>(),
    searchMessages
      ? searchMessageBodies(visibility, query, escapedQuery)
      : Promise.resolve<MessageSearchOutcome>({
          hitsByConversation: new Map(),
          incomplete: false,
          scopeTruncated: false,
        }),
  ]);

  const results = new Map<string, UnifiedConversationResult>();
  for (const ranked of rankContacts(candidates, query, isPhone).slice(0, limit)) {
    results.set(String(ranked.conv._id), toResult(ranked, query));
  }

  // Attach message snippets; add chats that matched only by message body.
  const messageOnlyIds: string[] = [];
  for (const [conversationId, snippets] of messageOutcome.hitsByConversation) {
    const existing = results.get(conversationId);
    if (existing) {
      existing.matches.matchedMessages = snippets;
      existing.matches.totalMessageMatches = snippets.length;
      existing.matchContext = generateMatchContext(existing.matches, query);
    } else {
      messageOnlyIds.push(conversationId);
    }
  }

  if (messageOnlyIds.length > 0 && results.size < limit) {
    const rows = await WhatsAppConversation.find({ _id: { $in: messageOnlyIds } })
      .select(CONVERSATION_SELECT)
      .lean<ConversationLean[]>();
    for (const conv of rows) {
      if (results.size >= limit) break;
      const snippets = messageOutcome.hitsByConversation.get(String(conv._id)) ?? [];
      const matches: UnifiedSearchMatch = {
        matchedInPhone: false,
        matchedInName: false,
        matchedInNotes: false,
        matchedMessages: snippets,
        totalMessageMatches: snippets.length,
        relevanceScore: Math.min(snippets.length * 10, 30),
      };
      results.set(String(conv._id), {
        conversationId: String(conv._id),
        participantPhone: conv.participantPhone,
        participantName: conv.participantName || "",
        participantProfilePic: conv.participantProfilePic,
        lastMessageContent: conv.lastMessageContent,
        lastMessageTime: conv.lastMessageTime,
        unreadCount: conv.unreadCount || 0,
        conversationType: conv.conversationType,
        assignedAgent: assignedAgentToString(conv.assignedAgent),
        status: conv.status,
        matches,
        matchContext: generateMatchContext(matches, query),
      });
    }
  }

  const conversations = [...results.values()];

  const archivedIds = await loadArchivedIds(conversations.map((c) => c.conversationId));
  for (const conv of conversations) {
    conv.isArchived = archivedIds.has(conv.conversationId);
  }

  const hasExactPhoneChat = conversations.some((c) => c.matches.phoneMatchType === "exact");
  const startNewChat =
    isPhone && !hasExactPhoneChat ? await resolveStartNewChat(user, query) : undefined;

  return {
    conversations,
    startNewChat,
    messageSearchIncomplete: messageOutcome.incomplete,
    scopeTruncated: messageOutcome.scopeTruncated,
  };
}
