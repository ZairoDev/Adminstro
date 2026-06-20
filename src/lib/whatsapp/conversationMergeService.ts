import mongoose from "mongoose";
import WhatsAppConversation from "@/models/whatsappConversation";
import WhatsAppMessage from "@/models/whatsappMessage";
import { normalizePhone } from "@/lib/whatsapp/normalizePhone";

export interface MergeGroupKey {
  phone: string;
  channelKey: string;
}

export interface ConversationPreview {
  _id: string;
  name: string;
  phone: string;
  location: string;
  businessPhoneId: string;
  whatsappChannelId: string;
  lastMessage: string;
  lastMessageTime: string;
  messageCount: number;
  agentMsgs: number;
  customerMsgs: number;
}

export interface MergeGroup {
  groupKey: MergeGroupKey;
  totalConversations: number;
  totalMessagesToMove: number;
  canonical: ConversationPreview;
  duplicates: ConversationPreview[];
}

export interface DryRunResult {
  totalGroups: number;
  totalDuplicateConversations: number;
  groups: MergeGroup[];
}

export interface MergeGroupResult {
  success: true;
  phone: string;
  channelKey: string;
  canonicalId: string;
  mergedCount: number;
  messagesMoved: number;
}

export interface MergeGroupError {
  phone: string;
  channelKey: string;
  error: string;
}

export interface MergeExecutionResult {
  success: boolean;
  merged: number;
  results: MergeGroupResult[];
  failedGroups: MergeGroupError[];
}

interface ConversationLean {
  _id: mongoose.Types.ObjectId;
  participantPhone: string;
  participantName?: string;
  participantLocation?: string;
  participantLocationKey?: string;
  participantProfilePic?: string;
  businessPhoneId: string;
  whatsappChannelId?: mongoose.Types.ObjectId;
  conversationType?: string;
  wabaId?: string;
  lastMessageTime?: Date;
  firstMessageTime?: Date;
  lastMessageContent?: string;
  createdAt?: Date;
  agentMessageCount?: number;
  customerMessageCount?: number;
}

export function mergeGroupKeyString(key: MergeGroupKey): string {
  return `${key.phone}__${key.channelKey}`;
}

function channelKeyForConversation(conv: ConversationLean): string {
  if (conv.whatsappChannelId) {
    return String(conv.whatsappChannelId);
  }
  const location = conv.participantLocationKey || "unknown";
  const type = conv.conversationType || "unknown";
  return `${location}-${type}`;
}

function sortByRecency(a: ConversationLean, b: ConversationLean): number {
  const aTime = new Date(a.lastMessageTime || a.createdAt || 0).getTime();
  const bTime = new Date(b.lastMessageTime || b.createdAt || 0).getTime();
  return bTime - aTime;
}

function toPreview(
  conv: ConversationLean,
  messageCount: number,
): ConversationPreview {
  return {
    _id: conv._id.toString(),
    name: conv.participantName || "",
    phone: conv.participantPhone,
    location: conv.participantLocation || "",
    businessPhoneId: conv.businessPhoneId || "",
    whatsappChannelId: conv.whatsappChannelId
      ? String(conv.whatsappChannelId)
      : "",
    lastMessage: conv.lastMessageContent || "",
    lastMessageTime: conv.lastMessageTime
      ? new Date(conv.lastMessageTime).toISOString()
      : "",
    messageCount,
    agentMsgs: conv.agentMessageCount ?? 0,
    customerMsgs: conv.customerMessageCount ?? 0,
  };
}

async function loadDuplicateGroups(): Promise<
  Map<string, ConversationLean[]>
> {
  const conversations = await WhatsAppConversation.find({
    source: { $ne: "internal" },
    status: { $nin: ["merged"] },
  })
    .select(
      "participantPhone participantName participantLocation participantLocationKey participantProfilePic businessPhoneId whatsappChannelId conversationType wabaId lastMessageTime firstMessageTime lastMessageContent createdAt agentMessageCount customerMessageCount",
    )
    .lean<ConversationLean[]>();

  const groups = new Map<string, ConversationLean[]>();

  for (const conv of conversations) {
    const phone = normalizePhone(conv.participantPhone);
    const channelKey = channelKeyForConversation(conv);
    const key = mergeGroupKeyString({ phone, channelKey });
    const existing = groups.get(key);
    if (existing) {
      existing.push(conv);
    } else {
      groups.set(key, [conv]);
    }
  }

  for (const [key, convs] of groups) {
    if (convs.length <= 1) {
      groups.delete(key);
    }
  }

  return groups;
}

async function attachMessageCounts(
  groups: Map<string, ConversationLean[]>,
): Promise<MergeGroup[]> {
  const allIds = [...groups.values()].flatMap((convs) =>
    convs.map((c) => c._id),
  );

  const msgCounts = await WhatsAppMessage.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
    { $match: { conversationId: { $in: allIds } } },
    { $group: { _id: "$conversationId", count: { $sum: 1 } } },
  ]);

  const countMap = new Map(
    msgCounts.map((m) => [m._id.toString(), m.count]),
  );

  const result: MergeGroup[] = [];

  for (const [key, convs] of groups) {
    const sorted = [...convs].sort(sortByRecency);
    const canonical = sorted[0];
    const duplicates = sorted.slice(1);
    const sep = key.indexOf("__");
    const phone = key.slice(0, sep);
    const channelKey = key.slice(sep + 2);

    const canonicalCount = countMap.get(canonical._id.toString()) ?? 0;
    const duplicatePreviews = duplicates.map((d) =>
      toPreview(d, countMap.get(d._id.toString()) ?? 0),
    );

    result.push({
      groupKey: { phone, channelKey },
      totalConversations: sorted.length,
      canonical: toPreview(canonical, canonicalCount),
      duplicates: duplicatePreviews,
      totalMessagesToMove: duplicatePreviews.reduce(
        (sum, d) => sum + d.messageCount,
        0,
      ),
    });
  }

  result.sort((a, b) => b.totalConversations - a.totalConversations);
  return result;
}

export async function findDuplicateConversationGroups(): Promise<DryRunResult> {
  const groups = await loadDuplicateGroups();
  const enriched = await attachMessageCounts(groups);

  return {
    totalGroups: enriched.length,
    totalDuplicateConversations: enriched.reduce(
      (sum, g) => sum + g.duplicates.length,
      0,
    ),
    groups: enriched,
  };
}

export async function mergeDuplicateConversationGroups(
  groupKeys: string[],
): Promise<MergeExecutionResult> {
  const allGroups = await loadDuplicateGroups();
  const keysToMerge =
    groupKeys.length > 0
      ? groupKeys.filter((k) => allGroups.has(k))
      : [...allGroups.keys()];

  const results: MergeGroupResult[] = [];
  const failedGroups: MergeGroupError[] = [];

  for (const key of keysToMerge) {
    const convs = allGroups.get(key);
    if (!convs || convs.length <= 1) continue;

    const sep = key.indexOf("__");
    const phone = key.slice(0, sep);
    const channelKey = key.slice(sep + 2);

    try {
      const sorted = [...convs].sort(sortByRecency);
      const canonical = sorted[0];
      const duplicates = sorted.slice(1);
      const canonicalId = canonical._id;
      const dupeIds = duplicates.map((d) => d._id);

      const msgMoveResult = await WhatsAppMessage.updateMany(
        { conversationId: { $in: dupeIds } },
        { $set: { conversationId: canonicalId } },
      );

      const bestLocation =
        sorted.find((c) => c.participantLocation)?.participantLocation ||
        canonical.participantLocation;
      const bestLocationKey =
        sorted.find((c) => c.participantLocationKey)?.participantLocationKey ||
        canonical.participantLocationKey;
      const bestProfilePic =
        sorted.find((c) => c.participantProfilePic)?.participantProfilePic ||
        canonical.participantProfilePic;
      const bestName = canonical.participantName;
      const bestChannelId =
        sorted.find((c) => c.whatsappChannelId)?.whatsappChannelId ||
        canonical.whatsappChannelId;
      const bestWabaId =
        sorted.find((c) => c.wabaId)?.wabaId || canonical.wabaId;

      const earliestFirstMessage = sorted.reduce<Date | undefined>(
        (earliest, c) => {
          if (!c.firstMessageTime) return earliest;
          if (!earliest) return c.firstMessageTime;
          return new Date(c.firstMessageTime) < new Date(earliest)
            ? c.firstMessageTime
            : earliest;
        },
        undefined,
      );

      await WhatsAppConversation.updateOne(
        { _id: canonicalId },
        {
          $set: {
            participantLocation: bestLocation,
            participantLocationKey: bestLocationKey,
            participantProfilePic: bestProfilePic,
            participantName: bestName,
            whatsappChannelId: bestChannelId,
            wabaId: bestWabaId,
            firstMessageTime: earliestFirstMessage,
            identityVersion: 2,
            updatedAt: new Date(),
          },
        },
      );

      await WhatsAppConversation.updateMany(
        { _id: { $in: dupeIds } },
        {
          $set: {
            status: "merged",
            mergedInto: canonicalId,
            mergedAt: new Date(),
            updatedAt: new Date(),
          },
        },
      );

      results.push({
        success: true,
        phone,
        channelKey,
        canonicalId: canonicalId.toString(),
        mergedCount: duplicates.length,
        messagesMoved: msgMoveResult.modifiedCount,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      failedGroups.push({ phone, channelKey, error: message });
    }
  }

  return {
    success: failedGroups.length === 0,
    merged: results.length,
    results,
    failedGroups,
  };
}
