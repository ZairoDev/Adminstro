import mongoose, { type PipelineStage } from "mongoose";
import WhatsAppConversation from "@/models/whatsappConversation";
import type { InboxConversationLean } from "./conversationsListEnrichment";

const READ_STATE_COLLECTION = "conversationreadstates";

/**
 * Per-employee unread filter stages — mirrors collectUnreadCountTargets +
 * batchComputeUnreadCounts, but resolves candidates in Mongo before pagination.
 */
export function buildUnreadInboxPipelineStages(
  userId: string | mongoose.Types.ObjectId,
): PipelineStage[] {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  return [
    {
      $match: {
        lastMessageDirection: "incoming",
        lastMessageId: { $exists: true, $nin: [null, ""] },
      },
    },
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
          { $project: { lastReadMessageId: 1, lastReadAt: 1 } },
          { $limit: 1 },
        ],
        as: "userReadState",
      },
    },
    {
      $addFields: {
        _userLastReadMessageId: {
          $arrayElemAt: ["$userReadState.lastReadMessageId", 0],
        },
        _userLastReadAt: {
          $arrayElemAt: ["$userReadState.lastReadAt", 0],
        },
        _hasUserReadState: { $gt: [{ $size: "$userReadState" }, 0] },
      },
    },
    {
      $match: {
        $or: [
          { _hasUserReadState: false },
          { _userLastReadMessageId: null },
          { $expr: { $ne: ["$_userLastReadMessageId", "$lastMessageId"] } },
        ],
      },
    },
    {
      $project: {
        userReadState: 0,
        _userLastReadMessageId: 0,
        _userLastReadAt: 0,
        _hasUserReadState: 0,
      },
    },
  ];
}

export async function fetchUnreadInboxConversationPage(
  query: Record<string, unknown>,
  userId: string | mongoose.Types.ObjectId,
  limit: number,
): Promise<InboxConversationLean[]> {
  if (query._id === null) {
    return [];
  }

  const pipeline: PipelineStage[] = [{ $match: query }];
  pipeline.push(...buildUnreadInboxPipelineStages(userId));
  pipeline.push({ $sort: { lastMessageTime: -1 } });
  pipeline.push({ $limit: limit + 1 });

  return WhatsAppConversation.aggregate<InboxConversationLean>(pipeline);
}

export async function aggregateUnreadInboxConversationCount(
  query: Record<string, unknown>,
  userId: string | mongoose.Types.ObjectId,
): Promise<number> {
  if (query._id === null) {
    return 0;
  }

  const pipeline: PipelineStage[] = [
    { $match: query },
    ...buildUnreadInboxPipelineStages(userId),
    { $count: "count" },
  ];

  const result = await WhatsAppConversation.aggregate<{ count: number }>(
    pipeline,
  );
  return result[0]?.count ?? 0;
}
