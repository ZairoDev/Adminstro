import mongoose, { type PipelineStage } from "mongoose";
import WhatsAppConversation from "@/models/whatsappConversation";
import type { GlobalArchiveSnapshot } from "./conversationsListEnrichment";

const READ_STATE_COLLECTION = "conversationreadstates";
const WHATSAPP_MESSAGE_COLLECTION = "whatsappmessages";

const EXPIRING_WINDOW_HOURS = 3;
const MS_PER_HOUR = 60 * 60 * 1000;

export type SummaryExpiringItem = {
  _id: string;
  participantPhone: string;
  participantName: string;
  lastMessageContent: string;
  hoursRemaining: number;
  minutesRemaining: number;
  totalMinutes: number;
  severity: "critical" | "urgent" | "warning";
  lastCustomerMessageAt: Date;
  businessPhoneId: string;
  assignedAgent?: string;
};

export type SummaryUnreadItem = {
  _id: string;
  participantPhone: string;
  participantName: string;
  lastMessageContent: string;
  unreadCount: number;
  lastMessageTime?: Date;
  businessPhoneId: string;
  assignedAgent?: string;
};

type ExpiringLean = {
  _id: mongoose.Types.ObjectId;
  participantPhone?: string;
  participantName?: string;
  lastMessageContent?: string;
  lastCustomerMessageAt?: Date;
  businessPhoneId?: string;
  assignedAgent?: mongoose.Types.ObjectId;
};

type UnreadLean = ExpiringLean & {
  unreadCount: number;
  lastMessageTime?: Date;
};

/** Shared visibility filter for summary queries (active, non-internal, non-archived). */
export function buildSummaryCandidateFilter(
  visibilityFilter: Record<string, unknown>,
  archivedSnapshot: GlobalArchiveSnapshot,
): Record<string, unknown> {
  const { archivedConversationIds } = archivedSnapshot;
  return {
    ...visibilityFilter,
    status: "active",
    source: { $ne: "internal" },
    ...(archivedConversationIds.length > 0 && {
      _id: { $nin: archivedConversationIds },
    }),
  };
}

/** Mongo date range for conversations in the last 3h of the 24h reply window. */
export function buildExpiringLastCustomerMessageAtRange(now: Date): {
  $gte: Date;
  $lte: Date;
} {
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * MS_PER_HOUR);
  const twentyOneHoursAgo = new Date(
    now.getTime() - (24 - EXPIRING_WINDOW_HOURS) * MS_PER_HOUR,
  );
  return {
    $gte: twentyFourHoursAgo,
    $lte: twentyOneHoursAgo,
  };
}

function unreadIncomingMatchExpr(): Record<string, unknown> {
  return {
    $and: [
      { $eq: ["$conversationId", "$$convId"] },
      { $eq: ["$direction", "incoming"] },
      {
        $or: [
          { $eq: [{ $ifNull: ["$$lastRead", null] }, null] },
          { $gt: ["$timestamp", "$$lastRead"] },
        ],
      },
    ],
  };
}

/** Stages that keep only conversations with at least one unread incoming message. */
export function buildSummaryUnreadPipelineStages(
  userId: string | mongoose.Types.ObjectId,
  includeUnreadCount = false,
): PipelineStage[] {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const messageLookupPipeline = (
    includeUnreadCount
      ? [
          {
            $match: {
              $expr: unreadIncomingMatchExpr(),
            },
          },
          { $count: "count" },
        ]
      : [
          {
            $match: {
              $expr: unreadIncomingMatchExpr(),
            },
          },
          { $limit: 1 },
        ]
  ) as PipelineStage[];

  const stages: PipelineStage[] = [
    {
      $lookup: {
        from: READ_STATE_COLLECTION,
        let: { convId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$conversationId", "$$convId"] },
                  { $eq: ["$userId", userObjectId] },
                ],
              },
            },
          },
          { $project: { lastReadAt: 1 } },
          { $limit: 1 },
        ],
        as: "userReadState",
      },
    },
    {
      $addFields: {
        _userLastReadAt: {
          $arrayElemAt: ["$userReadState.lastReadAt", 0],
        },
      },
    },
    {
      $lookup: {
        from: WHATSAPP_MESSAGE_COLLECTION,
        let: { convId: "$_id", lastRead: "$_userLastReadAt" },
        pipeline: messageLookupPipeline as never,
        as: includeUnreadCount ? "unreadCountResult" : "unreadMessages",
      },
    },
  ];

  if (includeUnreadCount) {
    stages.push(
      {
        $addFields: {
          unreadCount: {
            $ifNull: [
              { $arrayElemAt: ["$unreadCountResult.count", 0] },
              0,
            ],
          },
        },
      },
      { $match: { unreadCount: { $gt: 0 } } },
    );
  } else {
    stages.push({ $match: { "unreadMessages.0": { $exists: true } } });
  }

  stages.push({
    $project: {
      userReadState: 0,
      unreadMessages: 0,
      unreadCountResult: 0,
      _userLastReadAt: 0,
    },
  });

  return stages;
}

export function mapExpiringConversation(
  conv: ExpiringLean,
  now: Date,
): SummaryExpiringItem | null {
  if (!conv.lastCustomerMessageAt) return null;

  const lastMessage = new Date(conv.lastCustomerMessageAt);
  const msRemaining =
    lastMessage.getTime() + 24 * MS_PER_HOUR - now.getTime();
  const hoursRemaining = msRemaining / MS_PER_HOUR;

  if (hoursRemaining <= 0 || hoursRemaining > EXPIRING_WINDOW_HOURS) {
    return null;
  }

  const minutesRemaining = Math.floor(
    (msRemaining % MS_PER_HOUR) / (1000 * 60),
  );
  const totalMinutes = hoursRemaining * 60 + minutesRemaining;

  return {
    _id: conv._id.toString(),
    participantPhone: conv.participantPhone ?? "",
    participantName: conv.participantName || conv.participantPhone || "",
    lastMessageContent: conv.lastMessageContent || "No message",
    hoursRemaining: Math.floor(hoursRemaining),
    minutesRemaining,
    totalMinutes,
    severity:
      totalMinutes <= 60
        ? "critical"
        : totalMinutes <= 120
          ? "urgent"
          : "warning",
    lastCustomerMessageAt: conv.lastCustomerMessageAt,
    businessPhoneId: conv.businessPhoneId ?? "",
    assignedAgent: conv.assignedAgent?.toString(),
  };
}

export function mapUnreadConversation(conv: UnreadLean): SummaryUnreadItem {
  return {
    _id: conv._id.toString(),
    participantPhone: conv.participantPhone ?? "",
    participantName: conv.participantName || conv.participantPhone || "",
    lastMessageContent: conv.lastMessageContent || "No message",
    unreadCount: conv.unreadCount,
    lastMessageTime: conv.lastMessageTime,
    businessPhoneId: conv.businessPhoneId ?? "",
    assignedAgent: conv.assignedAgent?.toString(),
  };
}

export async function countExpiringSummaryConversations(
  candidateFilter: Record<string, unknown>,
  now: Date,
): Promise<number> {
  return WhatsAppConversation.countDocuments({
    ...candidateFilter,
    lastCustomerMessageAt: buildExpiringLastCustomerMessageAtRange(now),
  });
}

export async function fetchTopExpiringSummaryConversations(
  candidateFilter: Record<string, unknown>,
  now: Date,
  limit: number,
): Promise<SummaryExpiringItem[]> {
  const rows = (await WhatsAppConversation.find({
    ...candidateFilter,
    lastCustomerMessageAt: buildExpiringLastCustomerMessageAtRange(now),
  })
    .select(
      "_id participantPhone participantName lastMessageContent lastCustomerMessageAt businessPhoneId assignedAgent",
    )
    .sort({ lastCustomerMessageAt: 1 })
    .limit(limit)
    .lean()) as ExpiringLean[];

  return rows
    .map((row) => mapExpiringConversation(row, now))
    .filter((item): item is SummaryExpiringItem => item !== null)
    .sort((a, b) => a.totalMinutes - b.totalMinutes);
}

export async function aggregateSummaryUnreadCount(
  candidateFilter: Record<string, unknown>,
  userId: string | mongoose.Types.ObjectId,
): Promise<number> {
  if (candidateFilter._id === null) {
    return 0;
  }

  const pipeline: PipelineStage[] = [
    { $match: candidateFilter },
    ...buildSummaryUnreadPipelineStages(userId, false),
    { $count: "count" },
  ];

  const result = await WhatsAppConversation.aggregate<{ count: number }>(
    pipeline,
  );
  return result[0]?.count ?? 0;
}

export async function fetchTopUnreadSummaryConversations(
  candidateFilter: Record<string, unknown>,
  userId: string | mongoose.Types.ObjectId,
  limit: number,
): Promise<SummaryUnreadItem[]> {
  if (candidateFilter._id === null) {
    return [];
  }

  const pipeline: PipelineStage[] = [
    { $match: candidateFilter },
    ...buildSummaryUnreadPipelineStages(userId, true),
    { $sort: { lastMessageTime: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 1,
        participantPhone: 1,
        participantName: 1,
        lastMessageContent: 1,
        lastMessageTime: 1,
        businessPhoneId: 1,
        assignedAgent: 1,
        unreadCount: 1,
      },
    },
  ];

  const rows = await WhatsAppConversation.aggregate<UnreadLean>(pipeline);
  return rows.map(mapUnreadConversation);
}
