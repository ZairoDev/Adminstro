import mongoose, { type PipelineStage } from "mongoose";
import WhatsAppMessage from "@/models/whatsappMessage";
import ConversationArchiveState from "@/models/conversationArchiveState";
import ConversationReadState from "@/models/conversationReadState";
import WhatsAppConversation from "@/models/whatsappConversation";

/** Lean conversation document from inbox list query (before enrichment). */
export type InboxConversationLean = Record<string, unknown> & {
  _id: mongoose.Types.ObjectId;
  lastMessageId?: string;
  lastMessageDirection?: "incoming" | "outgoing" | string;
  conversationType?: "owner" | "guest" | string;
  source?: "meta" | "internal" | string;
  unreadCount?: number;
  lastMessageStatus?: string;
  isArchivedByUser?: boolean;
  archivedAt?: Date | null;
  archivedBy?: string | null;
  isInternal?: boolean;
};

export type ArchiveStateLean = {
  conversationId: mongoose.Types.ObjectId;
  isArchived: boolean;
  archivedAt?: Date;
  archivedBy?: mongoose.Types.ObjectId;
};

export type ReadStateLean = {
  conversationId: mongoose.Types.ObjectId;
  lastReadMessageId?: string;
  lastReadAt?: Date;
};

export type UnreadCountTarget = {
  conversationId: mongoose.Types.ObjectId;
  lastReadAt?: Date;
};

export type ConversationTypeUpdate = {
  conversationId: mongoose.Types.ObjectId;
  conversationType: "owner" | "guest";
};

export type GlobalArchiveSnapshot = {
  archivedConversationIds: mongoose.Types.ObjectId[];
  archivedCount: number;
};

export type InboxEnrichmentResult = {
  enriched: InboxConversationLean[];
  typeUpdates: ConversationTypeUpdate[];
};

/** Tab badge counts — same shape as GET /api/whatsapp/conversations/counts */
export type InboxConversationCounts = {
  totalCount: number;
  ownerCount: number;
  guestCount: number;
  unreadCount: number;
};

export const EMPTY_INBOX_CONVERSATION_COUNTS: InboxConversationCounts = {
  totalCount: 0,
  ownerCount: 0,
  guestCount: 0,
  unreadCount: 0,
};

const profilePicCache = new Map<
  string,
  { pic: string | null; expiresAt: number }
>();
const PROFILE_PIC_TTL_MS = 5 * 60 * 1000;

function normalizeLeadPhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Batch-load lead profile pictures with a short in-process TTL cache.
 * Phones are normalized to digits-only for lookup keys.
 */
export async function batchLoadLeadProfilePics(
  phones: string[],
): Promise<Map<string, string | null>> {
  const now = Date.now();
  const uncachedPhones: string[] = [];
  const result = new Map<string, string | null>();

  for (const phone of phones) {
    const normalized = normalizeLeadPhone(phone);
    if (!normalized) continue;

    const cached = profilePicCache.get(normalized);
    if (cached && cached.expiresAt > now) {
      result.set(normalized, cached.pic);
    } else if (!uncachedPhones.includes(normalized)) {
      uncachedPhones.push(normalized);
    }
  }

  if (uncachedPhones.length === 0) {
    return result;
  }

  const Query = (await import("@/models/query")).default;

  const leads = await Query.find({
    phoneNo: { $in: uncachedPhones },
    profilePicture: { $exists: true, $ne: "" },
  })
    .select("phoneNo profilePicture")
    .lean();

  const foundPhones = new Set<string>();

  for (const lead of leads as Array<{
    phoneNo?: string;
    profilePicture?: string;
  }>) {
    const normalized = normalizeLeadPhone(String(lead.phoneNo || ""));
    if (!normalized || !lead.profilePicture) continue;
    const expiresAt = now + PROFILE_PIC_TTL_MS;
    profilePicCache.set(normalized, { pic: lead.profilePicture, expiresAt });
    result.set(normalized, lead.profilePicture);
    foundPhones.add(normalized);
  }

  for (const phone of uncachedPhones) {
    if (!foundPhones.has(phone)) {
      profilePicCache.set(phone, { pic: null, expiresAt: now + PROFILE_PIC_TTL_MS });
      result.set(phone, null);
    }
  }

  return result;
}

/** Attach lead profile pictures to inbox rows (mutates conversations in place). */
export async function applyLeadProfilePicsToInboxPage(
  conversations: InboxConversationLean[],
): Promise<void> {
  const participantPhones = [
    ...new Set(
      conversations
        .filter((c) => c.participantPhone && c.source !== "internal")
        .map((c) => String(c.participantPhone).replace(/\D/g, "")),
    ),
  ].filter(Boolean);

  if (participantPhones.length === 0) {
    return;
  }

  const phoneToProfilePic = await batchLoadLeadProfilePics(participantPhones);
  for (const conv of conversations) {
    if (conv.source === "internal") continue;
    const normalized = String(conv.participantPhone || "").replace(/\D/g, "");
    const pic = phoneToProfilePic.get(normalized);
    if (pic) {
      conv.participantProfilePic = pic;
    }
  }
}

/**
 * Global archive is shared across users — only load rows where isArchived=true
 * (uses { isArchived: 1 } index) instead of scanning the entire collection.
 */
export async function loadGlobalArchivedConversationIds(): Promise<GlobalArchiveSnapshot> {
  const archivedConversationIds = await ConversationArchiveState.distinct(
    "conversationId",
    { isArchived: true },
  );

  return {
    archivedConversationIds: archivedConversationIds as mongoose.Types.ObjectId[],
    archivedCount: archivedConversationIds.length,
  };
}

/** Archive metadata for conversations on the current page only. */
export async function loadArchiveStatesForConversations(
  conversationIds: mongoose.Types.ObjectId[],
): Promise<Map<string, ArchiveStateLean>> {
  const map = new Map<string, ArchiveStateLean>();
  if (conversationIds.length === 0) {
    return map;
  }

  const states = await ConversationArchiveState.find({
    conversationId: { $in: conversationIds },
  })
    .select("conversationId isArchived archivedAt archivedBy")
    .lean();

  for (const state of states as unknown as ArchiveStateLean[]) {
    map.set(String(state.conversationId), state);
  }

  return map;
}

export async function loadReadStatesForUser(
  conversationIds: mongoose.Types.ObjectId[],
  userId: string | mongoose.Types.ObjectId,
): Promise<Map<string, ReadStateLean>> {
  const map = new Map<string, ReadStateLean>();
  if (conversationIds.length === 0) {
    return map;
  }

  const readStates = await ConversationReadState.find({
    conversationId: { $in: conversationIds },
    userId,
  })
    .select("conversationId lastReadMessageId lastReadAt")
    .lean();

  for (const rs of readStates as unknown as ReadStateLean[]) {
    map.set(String(rs.conversationId), rs);
  }

  return map;
}

export function inferConversationTypeFromTemplateName(
  templateName: string,
): "owner" | "guest" {
  const lower = templateName.toLowerCase();
  return lower.includes("owners_template") || lower.startsWith("owner")
    ? "owner"
    : "guest";
}

/** Batch last outgoing message delivery status by WhatsApp messageId (wamid). */
export async function batchLoadLastMessageStatuses(
  conversations: InboxConversationLean[],
): Promise<Map<string, string>> {
  const messageIds = [
    ...new Set(
      conversations
        .filter(
          (c) =>
            c.lastMessageDirection === "outgoing" &&
            typeof c.lastMessageId === "string" &&
            c.lastMessageId.length > 0,
        )
        .map((c) => c.lastMessageId as string),
    ),
  ];

  const statusMap = new Map<string, string>();
  if (messageIds.length === 0) {
    return statusMap;
  }

  const docs = await WhatsAppMessage.find({ messageId: { $in: messageIds } })
    .select("messageId status")
    .lean();

  for (const doc of docs as unknown as Array<{
    messageId: string;
    status?: string;
  }>) {
    if (doc.messageId && doc.status) {
      statusMap.set(doc.messageId, doc.status);
    }
  }

  return statusMap;
}

/** First outbound template per conversation (for type inference). */
export async function batchLoadFirstTemplateTypes(
  conversationIds: mongoose.Types.ObjectId[],
): Promise<Map<string, "owner" | "guest">> {
  const typeMap = new Map<string, "owner" | "guest">();
  if (conversationIds.length === 0) {
    return typeMap;
  }

  const pipeline: PipelineStage[] = [
    {
      $match: {
        conversationId: { $in: conversationIds },
        direction: "outgoing",
        type: "template",
        templateName: { $exists: true, $ne: null },
      },
    },
    { $sort: { timestamp: 1 } },
    {
      $group: {
        _id: "$conversationId",
        templateName: { $first: "$templateName" },
      },
    },
  ];

  const rows = await WhatsAppMessage.aggregate<{
    _id: mongoose.Types.ObjectId;
    templateName?: string;
  }>(pipeline);

  for (const row of rows) {
    if (row.templateName) {
      typeMap.set(
        String(row._id),
        inferConversationTypeFromTemplateName(String(row.templateName)),
      );
    }
  }

  return typeMap;
}

/** Conversations that need unread count aggregation for the current employee. */
export function collectUnreadCountTargets(
  conversations: InboxConversationLean[],
  readStateMap: Map<string, ReadStateLean>,
): UnreadCountTarget[] {
  const targets: UnreadCountTarget[] = [];

  for (const conv of conversations) {
    if (conv.lastMessageDirection !== "incoming" || !conv.lastMessageId) {
      continue;
    }

    const readState = readStateMap.get(String(conv._id));
    const lastReadMessageId = readState?.lastReadMessageId;

    if (lastReadMessageId && lastReadMessageId === conv.lastMessageId) {
      continue;
    }

    targets.push({
      conversationId: conv._id,
      lastReadAt: readState?.lastReadAt,
    });
  }

  return targets;
}

/**
 * Single aggregation replacing per-conversation countDocuments for unread.
 * Each target may have a different lastReadAt cutoff.
 */
/** Summary notifications: every visible conversation gets an unread target (no lastMessageId gate). */
export function buildSummaryUnreadTargets(
  conversationIds: mongoose.Types.ObjectId[],
  readStateMap: Map<string, ReadStateLean>,
): UnreadCountTarget[] {
  return conversationIds.map((conversationId) => ({
    conversationId,
    lastReadAt: readStateMap.get(String(conversationId))?.lastReadAt,
  }));
}

export type ArchivedUnreadMinimal = {
  _id: mongoose.Types.ObjectId;
  lastMessageId?: string;
  lastMessageDirection?: "incoming" | "outgoing" | string;
};

/** Sum unread incoming messages across archived rows (sidebar badge). */
export function sumArchivedUnreadMessages(
  conversations: ArchivedUnreadMinimal[],
  unreadCountByConversationId: Map<string, number>,
): number {
  return conversations.reduce((sum, conv) => {
    if (conv.lastMessageDirection !== "incoming") {
      return sum;
    }
    const unreadCount = unreadCountByConversationId.get(String(conv._id)) ?? 0;
    return sum + (unreadCount > 0 ? unreadCount : 0);
  }, 0);
}

/** Batch unread counts for archived conversation rows (inbox-style lastMessageId gate). */
export async function enrichArchivedConversationsWithUnread(
  conversations: InboxConversationLean[],
  userId: string | mongoose.Types.ObjectId,
): Promise<InboxConversationLean[]> {
  const conversationIds = conversations.map((c) => c._id);
  const readStateMap = await loadReadStatesForUser(conversationIds, userId);
  const unreadTargets = collectUnreadCountTargets(conversations, readStateMap);
  const unreadCountByConversationId =
    await batchComputeUnreadCounts(unreadTargets);

  return conversations.map((conv) => {
    let unreadCount = 0;
    if (conv.lastMessageDirection === "incoming" && conv.lastMessageId) {
      unreadCount = unreadCountByConversationId.get(String(conv._id)) ?? 0;
    }
    return { ...conv, unreadCount };
  });
}

export async function batchComputeUnreadCounts(
  targets: UnreadCountTarget[],
): Promise<Map<string, number>> {
  const countMap = new Map<string, number>();
  if (targets.length === 0) {
    return countMap;
  }

  const orConditions = targets.map(({ conversationId, lastReadAt }) => {
    const clause: Record<string, unknown> = {
      conversationId,
      direction: "incoming",
    };
    if (lastReadAt) {
      clause.timestamp = { $gt: lastReadAt };
    }
    return clause;
  });

  const pipeline: PipelineStage[] = [
    { $match: { $or: orConditions } },
    { $group: { _id: "$conversationId", count: { $sum: 1 } } },
  ];

  const rows = await WhatsAppMessage.aggregate<{
    _id: mongoose.Types.ObjectId;
    count: number;
  }>(pipeline);

  for (const row of rows) {
    countMap.set(String(row._id), row.count);
  }

  return countMap;
}

export function resolveConversationType(
  conv: InboxConversationLean,
  inferredTypeByConversationId: Map<string, "owner" | "guest">,
): "owner" | "guest" {
  if (conv.conversationType === "owner" || conv.conversationType === "guest") {
    return conv.conversationType;
  }

  return inferredTypeByConversationId.get(String(conv._id)) ?? "guest";
}

type BatchLookupMaps = {
  readStateMap: Map<string, ReadStateLean>;
  lastMessageStatusByMessageId: Map<string, string>;
  inferredTypeByConversationId: Map<string, "owner" | "guest">;
  unreadCountByConversationId: Map<string, number>;
  archiveStateByConversationId: Map<string, ArchiveStateLean>;
};

/**
 * Apply batch enrichment to inbox rows — same field names/shapes as the legacy loop.
 */
export function enrichInboxConversations(
  conversations: InboxConversationLean[],
  batch: BatchLookupMaps,
): InboxEnrichmentResult {
  const typeUpdates: ConversationTypeUpdate[] = [];
  const enriched: InboxConversationLean[] = [];

  for (const conv of conversations) {
    const next: InboxConversationLean = { ...conv };

    if (
      next.lastMessageDirection === "outgoing" &&
      typeof next.lastMessageId === "string"
    ) {
      const status = batch.lastMessageStatusByMessageId.get(next.lastMessageId);
      if (status) {
        next.lastMessageStatus = status;
      }
    }

    const storedType = conv.conversationType;
    const resolvedType = resolveConversationType(
      conv,
      batch.inferredTypeByConversationId,
    );
    next.conversationType = resolvedType;

    if (storedType !== "owner" && storedType !== "guest") {
      if (storedType !== resolvedType) {
        typeUpdates.push({
          conversationId: conv._id,
          conversationType: resolvedType,
        });
      }
    }

    let unreadCount = 0;
    if (next.lastMessageDirection === "incoming" && next.lastMessageId) {
      unreadCount =
        batch.unreadCountByConversationId.get(String(conv._id)) ?? 0;
    }
    next.unreadCount = unreadCount;

    const archiveState = batch.archiveStateByConversationId.get(String(conv._id));
    next.isArchivedByUser = archiveState?.isArchived ?? false;
    next.archivedAt = archiveState?.archivedAt ?? null;
    next.archivedBy = archiveState?.archivedBy?.toString() ?? null;
    next.isInternal = conv.source === "internal";

    enriched.push(next);
  }

  return { enriched, typeUpdates };
}

/** Fire-and-forget background writes for inferred conversation types. */
export function scheduleConversationTypeUpdates(
  updates: ConversationTypeUpdate[],
): void {
  if (updates.length === 0) {
    return;
  }

  void Promise.all(
    updates.map(({ conversationId, conversationType }) =>
      WhatsAppConversation.findByIdAndUpdate(
        conversationId,
        { conversationType },
        { new: false },
      ),
    ),
  ).catch((err) => {
    console.error("Background conversation type inference failed:", err);
  });
}

/** Run all batch enrichment queries for a page of conversations. */
export async function enrichInboxConversationPage(
  conversations: InboxConversationLean[],
  userId: string | mongoose.Types.ObjectId,
): Promise<InboxEnrichmentResult> {
  const conversationIds = conversations.map((c) => c._id);

  const needsTypeInference = conversations.filter(
    (c) => c.conversationType !== "owner" && c.conversationType !== "guest",
  );
  const typeInferenceIds = needsTypeInference.map((c) => c._id);

  const [
    readStateMap,
    lastMessageStatusByMessageId,
    inferredTypeByConversationId,
    archiveStateByConversationId,
  ] = await Promise.all([
    loadReadStatesForUser(conversationIds, userId),
    batchLoadLastMessageStatuses(conversations),
    batchLoadFirstTemplateTypes(typeInferenceIds),
    loadArchiveStatesForConversations(conversationIds),
  ]);

  const unreadTargets = collectUnreadCountTargets(conversations, readStateMap);
  const unreadCountByConversationId =
    await batchComputeUnreadCounts(unreadTargets);

  return enrichInboxConversations(conversations, {
    readStateMap,
    lastMessageStatusByMessageId,
    inferredTypeByConversationId,
    unreadCountByConversationId,
    archiveStateByConversationId,
  });
}

/**
 * Fetch inbox page via aggregation ($match → $sort → $limit).
 * Replaces WhatsAppConversation.find().sort().limit() with equivalent pipeline.
 */
export async function fetchInboxConversationPage(
  query: Record<string, unknown>,
  limit: number,
): Promise<InboxConversationLean[]> {
  const pipeline: PipelineStage[] = [
    { $match: query },
    { $sort: { lastMessageTime: -1 } },
    { $limit: limit + 1 },
  ];

  return WhatsAppConversation.aggregate<InboxConversationLean>(pipeline);
}

type InboxCountsFacetRow = {
  total: Array<{ count: number }>;
  owners: Array<{ count: number }>;
  guests: Array<{ count: number }>;
};

/**
 * Owner/guest/total counts for inbox tab badges.
 * Uses the same base filter as GET /api/whatsapp/conversations/counts
 * (visibility + location/label/adminQueue — no search, cursor, or pagination).
 */
export async function aggregateInboxConversationCounts(
  baseQuery: Record<string, unknown>,
): Promise<InboxConversationCounts> {
  if (baseQuery._id === null) {
    return EMPTY_INBOX_CONVERSATION_COUNTS;
  }

  const facetResult = await WhatsAppConversation.aggregate<InboxCountsFacetRow>([
    { $match: baseQuery },
    {
      $facet: {
        total: [{ $count: "count" }],
        owners: [
          { $match: { conversationType: "owner" } },
          { $count: "count" },
        ],
        guests: [
          { $match: { conversationType: "guest" } },
          { $count: "count" },
        ],
      },
    },
  ]);

  const facet = facetResult[0];
  return {
    totalCount: facet?.total[0]?.count ?? 0,
    ownerCount: facet?.owners[0]?.count ?? 0,
    guestCount: facet?.guests[0]?.count ?? 0,
    unreadCount: 0,
  };
}
