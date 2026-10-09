/**
 * Unified WhatsApp Search API - Conversation-Centric Deduplication
 * Single aggregation pipeline that returns each conversation exactly once
 * with all match information aggregated
 */

import { NextRequest, NextResponse } from "next/server";
import type { PipelineStage } from "mongoose";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import {
  buildInboxContactSearchClause,
  escapeRegex,
  isPhoneQuery,
  normalizePhoneNumber,
} from "@/lib/whatsapp/searchUtils";
export const dynamic = "force-dynamic";
import WhatsAppConversation from "@/models/whatsappConversation";
import WhatsAppMessage from "@/models/whatsappMessage";
import { buildInboxListQueryAsync } from "@/lib/whatsapp/inboxQuery";
import type { WhatsAppToken } from "@/lib/whatsapp/apiContext";
import {
  generateMatchContext,
  extractMessageSnippet,
  highlightSearchTerm,
  deduplicateConversations,
  type UnifiedConversationResult,
  type UnifiedSearchResults,
} from "@/lib/whatsapp/unifiedSearchUtils";
import {
  applyPhoneMaskToConversation,
  getDisplayPhone,
  resolveMaskRulesForToken,
  shouldMaskConversationPhone,
} from "@/lib/whatsapp/phoneMask";

const SEARCH_TIMEOUT = 3000; // 3 seconds
const MESSAGE_SEARCH_TIMEOUT = 2000;
const MESSAGE_RAW_CAP = 150;
const MAX_RESULTS_PER_QUERY = 50;
const MAX_MESSAGES_PER_CONVERSATION = 3; // Show top 3 message matches per conversation

type SnippetMessage = {
  messageId: string;
  snippet: string;
  timestamp: Date;
  direction: "incoming" | "outgoing";
  mediaUrl?: string;
};

function toSnippetMessage(
  msg: {
    _id?: { toString(): string };
    messageId?: string;
    content?: { text?: string; caption?: string };
    timestamp: Date;
    direction: "incoming" | "outgoing";
    mediaUrl?: string;
  },
  normalizedQuery: string,
): SnippetMessage {
  const text = msg.content?.text || msg.content?.caption || "";
  return {
    messageId: msg.messageId || msg._id?.toString() || "",
    snippet: highlightSearchTerm(extractMessageSnippet(text, normalizedQuery), normalizedQuery),
    timestamp: msg.timestamp,
    direction: msg.direction,
    mediaUrl: msg.mediaUrl,
  };
}

/**
 * Message-body hits, then dropped unless the conversation passes the inbox filter.
 * A timeout returns incomplete so People results can still be shown.
 */
type MessageConversationHit = {
  conversationId: string;
  participantPhone: string;
  participantName: string;
  participantProfilePic?: string;
  lastMessageContent?: string;
  lastMessageTime: Date;
  unreadCount: number;
  conversationType?: "owner" | "guest";
  assignedAgent?: string;
  status?: string;
  snippets: SnippetMessage[];
};

async function findBoundedMessageHits(
  escapedQuery: string,
  normalizedQuery: string,
  inboxFilter: Record<string, unknown>,
): Promise<{ hits: MessageConversationHit[]; incomplete: boolean }> {
  try {
    const grouped = await WhatsAppMessage.aggregate<{
      _id: { toString(): string };
      messages: Array<{
        _id?: { toString(): string };
        messageId?: string;
        content?: { text?: string; caption?: string };
        timestamp: Date;
        direction: "incoming" | "outgoing";
        mediaUrl?: string;
      }>;
    }>([
      {
        $match: {
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
      .option({ maxTimeMS: MESSAGE_SEARCH_TIMEOUT })
      .exec();

    if (grouped.length === 0) {
      return { hits: [], incomplete: false };
    }

    const ids = grouped.map((group) => group._id).filter(Boolean);
    const visible = await WhatsAppConversation.find({
      $and: [inboxFilter, { _id: { $in: ids } }],
    })
      .select(
        "participantPhone participantName participantProfilePic lastMessageContent lastMessageTime unreadCount conversationType assignedAgent status",
      )
      .lean<
        Array<{
          _id: { toString(): string };
          participantPhone: string;
          participantName: string;
          participantProfilePic?: string;
          lastMessageContent?: string;
          lastMessageTime: Date;
          unreadCount?: number;
          conversationType?: "owner" | "guest";
          assignedAgent?: string;
          status?: string;
        }>
      >();

    const visibleById = new Map(visible.map((conv) => [String(conv._id), conv]));
    const hits: MessageConversationHit[] = [];
    for (const group of grouped) {
      const id = String(group._id);
      const conv = visibleById.get(id);
      if (!conv) continue;
      const snippets = group.messages
        .slice(0, MAX_MESSAGES_PER_CONVERSATION)
        .map((msg) => toSnippetMessage(msg, normalizedQuery))
        .filter((msg) => msg.messageId);
      if (snippets.length === 0) continue;
      hits.push({
        conversationId: id,
        participantPhone: conv.participantPhone,
        participantName: conv.participantName,
        participantProfilePic: conv.participantProfilePic,
        lastMessageContent: conv.lastMessageContent,
        lastMessageTime: conv.lastMessageTime,
        unreadCount: conv.unreadCount || 0,
        conversationType: conv.conversationType,
        assignedAgent:
          typeof conv.assignedAgent === "string"
            ? conv.assignedAgent
            : conv.assignedAgent
              ? String(conv.assignedAgent)
              : undefined,
        status: conv.status,
        snippets,
      });
    }

    return { hits, incomplete: false };
  } catch (error) {
    console.error("Message search failed:", error);
    return { hits: [], incomplete: true };
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // ========================================================================
    // 1. VALIDATE REQUEST
    // ========================================================================
    
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("query");
    const locationFilterParam = searchParams.get("locationFilter")?.trim() || "";
    const adminQueue = searchParams.get("adminQueue") === "true";
    const limit = Math.min(
      parseInt(searchParams.get("limit") || String(MAX_RESULTS_PER_QUERY)),
      MAX_RESULTS_PER_QUERY
    );
    const includeArchived = searchParams.get("includeArchived") === "true";
    
    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Query parameter is required" },
        { status: 400 }
      );
    }
    
    // ========================================================================
    // 2. AUTHENTICATE & AUTHORIZE
    // ========================================================================
    
    const user = await getDataFromToken(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const userRole = user.role;
    
    // Advert may search names. The inbox filter below keeps them on retarget chats.
    const { WHATSAPP_ACCESS_ROLES } = await import("@/lib/whatsapp/config");
    const hasAccess = (WHATSAPP_ACCESS_ROLES as readonly string[]).includes(
      userRole as string,
    );

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: "No WhatsApp access" },
        { status: 403 }
      );
    }
    
    await connectDb();
    
    // ========================================================================
    // 3. PREPARE SEARCH PARAMETERS
    // ========================================================================
    
    const normalizedQuery = query.trim();
    const isPhone = isPhoneQuery(normalizedQuery);
    const normalizedPhone = isPhone ? normalizePhoneNumber(normalizedQuery) : null;
    const phoneDigits = normalizedPhone ?? "";
    const phoneLast10 =
      phoneDigits.length >= 10 ? phoneDigits.slice(-10) : phoneDigits;
    const escapedQuery = escapeRegex(normalizedQuery);
    
    // ========================================================================
    // 4. BUILD SINGLE UNIFIED AGGREGATION PIPELINE
    // ========================================================================
    
    // Same envelope as the inbox list: city, line, rental, channel, handoff, retarget.
    // Do not write the search $or onto this object.
    const inboxFilter = await buildInboxListQueryAsync(user as WhatsAppToken, {
      status: "active",
      adminQueue,
      locationFilter: adminQueue ? "" : locationFilterParam,
    });
    if (includeArchived) {
      inboxFilter.archived = true;
    } else {
      inboxFilter.archived = { $ne: true };
    }

    if ("_id" in inboxFilter && inboxFilter._id === null) {
      return NextResponse.json({
        success: true,
        query: normalizedQuery,
        results: {
          conversations: [],
          totalResults: 0,
          searchTime: Date.now() - startTime,
          messageSearchIncomplete: false,
        },
      });
    }

    const contactClause = buildInboxContactSearchClause(normalizedQuery);
    const searchMatch = { $and: [inboxFilter, contactClause] };
    
    // Match the whole allowed inbox first, score, then cap the rows we show.
    // Message lookup runs only on those rows so it cannot hide a contact.
    const pipeline: Record<string, unknown>[] = [
      { $match: searchMatch },

      {
        $addFields: {
          phoneExactMatch: isPhone
            ? { $eq: ["$participantPhone", phoneDigits] }
            : false,
          phoneSuffixMatch:
            isPhone && phoneLast10
              ? {
                  $regexMatch: {
                    input: "$participantPhone",
                    regex: `${escapeRegex(phoneLast10)}$`,
                  },
                }
              : false,
          phoneContainsMatch: false,
          nameMatch: {
            $regexMatch: {
              input: { $ifNull: ["$participantName", ""] },
              regex: escapedQuery,
              options: "i",
            },
          },
          notesMatch: {
            $regexMatch: {
              input: { $ifNull: ["$notes", ""] },
              regex: escapedQuery,
              options: "i",
            },
          },
        },
      },

      {
        $addFields: {
          relevanceScore: {
            $add: [
              { $cond: [{ $eq: ["$phoneExactMatch", true] }, 100, 0] },
              {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$phoneExactMatch", false] },
                      { $eq: ["$phoneSuffixMatch", true] },
                    ],
                  },
                  50,
                  0,
                ],
              },
              { $cond: [{ $eq: ["$nameMatch", true] }, 40, 0] },
              { $cond: [{ $eq: ["$notesMatch", true] }, 5, 0] },
            ],
          },
        },
      },

      {
        $sort: {
          relevanceScore: -1,
          lastMessageTime: -1,
        },
      },

      { $limit: limit },

      {
        $project: {
          conversationId: { $toString: "$_id" },
          participantPhone: 1,
          participantName: 1,
          participantProfilePic: 1,
          lastMessageContent: 1,
          lastMessageTime: 1,
          unreadCount: 1,
          conversationType: 1,
          assignedAgent: 1,
          status: 1,
          phoneExactMatch: 1,
          phoneSuffixMatch: 1,
          phoneContainsMatch: 1,
          nameMatch: 1,
          notesMatch: 1,
          matchedMessages: 1,
          relevanceScore: 1,
          _id: 0,
        },
      },
    ];
    
    // ========================================================================
    // 5. EXECUTE AGGREGATION WITH TIMEOUT
    // ========================================================================
    
    const searchMessages =
      normalizedQuery.length >= 2 && !isPhone;

    const [rawResults, messageHits] = await Promise.all([
      WhatsAppConversation.aggregate(pipeline as unknown as PipelineStage[])
        .allowDiskUse(true)
        .option({ maxTimeMS: SEARCH_TIMEOUT })
        .exec() as Promise<any[]>,
      searchMessages
        ? findBoundedMessageHits(escapedQuery, normalizedQuery, inboxFilter)
        : Promise.resolve({
            hits: [] as MessageConversationHit[],
            incomplete: false,
          }),
    ]);
    
    // ========================================================================
    // 6. TRANSFORM TO UNIFIED RESULT FORMAT
    // ========================================================================
    
    const conversations: UnifiedConversationResult[] = rawResults.map((conv) => {
      // Determine phone match type
      let phoneMatchType: 'exact' | 'suffix' | 'contains' | undefined;
      if (conv.phoneExactMatch) phoneMatchType = 'exact';
      else if (conv.phoneSuffixMatch) phoneMatchType = 'suffix';
      else if (conv.phoneContainsMatch) phoneMatchType = 'contains';
      
      // Process message matches
      const processedMessages = (conv.matchedMessages || [])
        .slice(0, MAX_MESSAGES_PER_CONVERSATION)
        .map((msg: any) => toSnippetMessage(msg, normalizedQuery));
      
      const matches = {
        matchedInPhone: !!phoneMatchType,
        phoneMatchType,
        phoneMatchedText: phoneMatchType ? conv.participantPhone : undefined,
        
        matchedInName: conv.nameMatch,
        nameMatchedText: conv.nameMatch
          ? highlightSearchTerm(conv.participantName, normalizedQuery)
          : undefined,
        
        matchedInNotes: conv.notesMatch,
        notesSnippet: conv.notesMatch ? `Found in notes` : undefined,
        
        matchedMessages: processedMessages,
        totalMessageMatches: processedMessages.length,
        
        relevanceScore: conv.relevanceScore,
      };
      
      return {
        conversationId: conv.conversationId,
        participantPhone: conv.participantPhone,
        participantName: conv.participantName,
        participantProfilePic: conv.participantProfilePic,
        lastMessageContent: conv.lastMessageContent,
        lastMessageTime: conv.lastMessageTime,
        unreadCount: conv.unreadCount || 0,
        conversationType: conv.conversationType,
        assignedAgent: conv.assignedAgent,
        status: conv.status,
        
        matches,
        matchContext: generateMatchContext(matches, normalizedQuery),
      };
    });
    
    // ========================================================================
    // 7. DEDUPLICATION (SAFETY NET)
    // ========================================================================
    
    for (const hit of messageHits.hits) {
      const existing = conversations.find(
        (conv) => conv.conversationId === hit.conversationId,
      );
      if (existing) {
        existing.matches.matchedMessages = hit.snippets;
        existing.matches.totalMessageMatches = hit.snippets.length;
        existing.matchContext = generateMatchContext(existing.matches, normalizedQuery);
        continue;
      }
      const matches = {
        matchedInPhone: false,
        matchedInName: false,
        matchedInNotes: false,
        matchedMessages: hit.snippets,
        totalMessageMatches: hit.snippets.length,
        relevanceScore: Math.min(hit.snippets.length * 10, 30),
      };
      conversations.push({
        conversationId: hit.conversationId,
        participantPhone: hit.participantPhone,
        participantName: hit.participantName,
        participantProfilePic: hit.participantProfilePic,
        lastMessageContent: hit.lastMessageContent,
        lastMessageTime: hit.lastMessageTime,
        unreadCount: hit.unreadCount,
        conversationType: hit.conversationType,
        assignedAgent: hit.assignedAgent,
        status: hit.status,
        matches,
        matchContext: generateMatchContext(matches, normalizedQuery),
      });
    }

    const deduplicated = deduplicateConversations(conversations);

    const phoneMaskRules = await resolveMaskRulesForToken(user as {
      id?: string;
      _id?: string;
      role?: string;
      whatsappPhoneMask?: Partial<{ maskOwnerPhones: boolean; maskGuestPhones: boolean }>;
    });
    const roleStr = String(userRole || "");
    const maskedDeduplicated = deduplicated.map((conv) => {
      const type =
        conv.conversationType === "owner" || conv.conversationType === "guest"
          ? conv.conversationType
          : undefined;
      const masked = applyPhoneMaskToConversation(conv, phoneMaskRules, roleStr);
      if (
        masked.matches?.phoneMatchedText &&
        shouldMaskConversationPhone(type, phoneMaskRules, roleStr)
      ) {
        masked.matches = {
          ...masked.matches,
          phoneMatchedText: getDisplayPhone(
            conv.participantPhone,
            type,
            phoneMaskRules,
            roleStr,
          ),
        };
      }
      return masked;
    });
    
    // Verify no duplicates (development assertion)
    if (process.env.NODE_ENV === 'development') {
      const ids = new Set(maskedDeduplicated.map(c => c.conversationId));
      if (ids.size !== maskedDeduplicated.length) {
        console.error('DEDUPLICATION FAILED: Found duplicate conversation IDs');
      }
    }
    
    // ========================================================================
    // 8. CHECK FOR "START NEW CHAT" OPTION
    // ========================================================================
    
    let hasStartNewChat = false;
    let startNewChatPhone: string | undefined;
    
    if (isPhone && normalizedPhone) {
      // Check if any result is an exact phone match
      const hasExactMatch = maskedDeduplicated.some(
        c => c.matches.phoneMatchType === 'exact'
      );
      
      if (!hasExactMatch) {
        hasStartNewChat = true;
        startNewChatPhone = normalizedPhone;
      }
    }
    
    // ========================================================================
    // 9. RETURN RESULTS
    // ========================================================================
    
    const searchTime = Date.now() - startTime;
    
    const response: UnifiedSearchResults = {
      conversations: maskedDeduplicated,
      totalResults: maskedDeduplicated.length,
      searchTime,
      hasStartNewChat,
      startNewChatPhone,
      messageSearchIncomplete: messageHits.incomplete,
    };
    
    return NextResponse.json({
      success: true,
      query: normalizedQuery,
      results: response,
    });
    
  } catch (error: any) {
    console.error("Unified search error:", error);
    
    const searchTime = Date.now() - startTime;
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Search failed",
        searchTime,
      },
      { status: 500 }
    );
  }
}

