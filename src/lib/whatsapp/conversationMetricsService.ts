import mongoose from "mongoose";
import WhatsAppConversation, {
  type IWhatsAppConversation,
} from "@/models/whatsappConversation";
import WhatsAppMessage from "@/models/whatsappMessage";
import Visits from "@/models/visit";
import Bookings from "@/models/booking";
import { WHATSAPP_CRM_LABELS } from "@/lib/whatsapp/crmLabels";

export const SLA_RESPONSE_MINUTES = 15;

export type LeadTemperature = "hot" | "warm" | "cold" | "dormant";

const MS_PER_MINUTE = 60_000;

function isSuccessfulOutgoing(status: string): boolean {
  return status !== "failed" && status !== "sending";
}

export function computeLeadTemperature(input: {
  customerMessageCount: number;
  agentMessageCount: number;
  lastMessageTime?: Date | null;
  firstCustomerReplyAt?: Date | null;
  firstOutboundMessageAt?: Date | null;
  hasVisit?: boolean;
  hasGoodToGo?: boolean;
}): LeadTemperature {
  const now = Date.now();
  const lastActivity = input.lastMessageTime
    ? new Date(input.lastMessageTime).getTime()
    : 0;
  const daysSinceActivity =
    lastActivity > 0 ? (now - lastActivity) / (24 * 60 * 60 * 1000) : 999;

  if (daysSinceActivity >= 7) return "dormant";
  if (input.hasGoodToGo || input.hasVisit) return "hot";
  if (input.customerMessageCount >= 3) return "hot";

  if (input.customerMessageCount >= 1 && input.agentMessageCount > 0) {
    if (input.firstCustomerReplyAt && input.firstOutboundMessageAt) {
      const replyMs =
        new Date(input.firstCustomerReplyAt).getTime() -
        new Date(input.firstOutboundMessageAt).getTime();
      if (replyMs <= 2 * 60 * 60 * 1000) return "warm";
    }
    return "warm";
  }

  return "cold";
}

export function computeEngagementScore(input: {
  customerMessageCount: number;
  agentMessageCount: number;
  leadTemperature: LeadTemperature;
  slaBreached: boolean;
}): number {
  let score = 0;
  if (input.agentMessageCount > 0 && input.customerMessageCount > 1) score += 35;
  else if (input.customerMessageCount > 0) score += 15;

  if (input.customerMessageCount >= 3) score += 25;
  else if (input.customerMessageCount >= 2) score += 12;

  if (!input.slaBreached && input.agentMessageCount > 0) score += 15;

  switch (input.leadTemperature) {
    case "hot":
      score += 25;
      break;
    case "warm":
      score += 15;
      break;
    case "cold":
      score += 5;
      break;
    default:
      break;
  }

  return Math.min(100, Math.max(0, score));
}

interface MessageRow {
  direction: string;
  status: string;
  timestamp: Date;
  templateName?: string;
  type?: string;
}

export interface DerivedConversationMetrics {
  firstOutboundMessageAt?: Date;
  firstCustomerReplyAt?: Date;
  firstAgentReplyAt?: Date;
  customerMessageCount: number;
  agentMessageCount: number;
  openingTemplateName?: string;
  slaBreached: boolean;
}

/** Pure function — derive metrics from sorted message history. */
export function deriveMetricsFromMessages(
  messages: MessageRow[],
): DerivedConversationMetrics {
  let firstOutboundMessageAt: Date | undefined;
  let firstCustomerReplyAt: Date | undefined;
  let firstAgentReplyAt: Date | undefined;
  let customerMessageCount = 0;
  let agentMessageCount = 0;
  let openingTemplateName: string | undefined;
  let sawCustomerMessage = false;

  for (const msg of messages) {
    const ts = new Date(msg.timestamp);
    if (msg.direction === "outgoing" && isSuccessfulOutgoing(msg.status)) {
      agentMessageCount += 1;
      if (!firstOutboundMessageAt) {
        firstOutboundMessageAt = ts;
        if (msg.type === "template" && msg.templateName) {
          openingTemplateName = msg.templateName;
        }
      }
      if (sawCustomerMessage && !firstAgentReplyAt) {
        firstAgentReplyAt = ts;
      }
    } else if (msg.direction === "incoming") {
      customerMessageCount += 1;
      sawCustomerMessage = true;
      if (firstOutboundMessageAt && !firstCustomerReplyAt) {
        firstCustomerReplyAt = ts;
      }
    }
  }

  let slaBreached = false;
  if (firstCustomerReplyAt) {
    if (!firstAgentReplyAt) {
      const elapsed = Date.now() - firstCustomerReplyAt.getTime();
      if (elapsed > SLA_RESPONSE_MINUTES * MS_PER_MINUTE) slaBreached = true;
    } else {
      const agentMs =
        firstAgentReplyAt.getTime() - firstCustomerReplyAt.getTime();
      slaBreached = agentMs > SLA_RESPONSE_MINUTES * MS_PER_MINUTE;
    }
  }

  return {
    firstOutboundMessageAt,
    firstCustomerReplyAt,
    firstAgentReplyAt,
    customerMessageCount,
    agentMessageCount,
    openingTemplateName,
    slaBreached,
  };
}

/** Bulk-load messages and derive metrics per conversation (for analytics). */
export async function bulkDeriveMetricsFromMessages(
  conversationIds: mongoose.Types.ObjectId[],
): Promise<Map<string, DerivedConversationMetrics>> {
  const result = new Map<string, DerivedConversationMetrics>();
  if (conversationIds.length === 0) return result;

  const messages = await WhatsAppMessage.find({
    conversationId: { $in: conversationIds },
    source: { $ne: "internal" },
  })
    .select("conversationId direction status timestamp templateName type")
    .sort({ timestamp: 1 })
    .lean<Array<MessageRow & { conversationId: mongoose.Types.ObjectId }>>();

  const grouped = new Map<string, MessageRow[]>();
  for (const msg of messages) {
    const key = msg.conversationId.toString();
    const list = grouped.get(key) ?? [];
    list.push(msg);
    grouped.set(key, list);
  }

  for (const id of conversationIds) {
    const key = id.toString();
    result.set(key, deriveMetricsFromMessages(grouped.get(key) ?? []));
  }

  return result;
}

/** Recompute all analytics fields from message history (backfill). */
export async function syncConversationMetricsFromMessages(
  conversationId: mongoose.Types.ObjectId | string,
): Promise<void> {
  const conv = await WhatsAppConversation.findById(conversationId)
    .select(
      "labels leadQueryId participantPhone lastMessageTime openingTemplateName",
    )
    .lean<IWhatsAppConversation | null>();
  if (!conv) return;

  const messages = await WhatsAppMessage.find({
    conversationId,
    source: { $ne: "internal" },
  })
    .select("direction status timestamp templateName type")
    .sort({ timestamp: 1 })
    .lean<MessageRow[]>();

  const {
    firstOutboundMessageAt,
    firstCustomerReplyAt,
    firstAgentReplyAt,
    customerMessageCount,
    agentMessageCount,
    openingTemplateName: derivedTemplate,
    slaBreached,
  } = deriveMetricsFromMessages(messages);

  const openingTemplateName = derivedTemplate || conv.openingTemplateName || "";

  let lastCustomerReplyAt: Date | undefined;
  let lastAgentReplyAt: Date | undefined;
  for (const msg of messages) {
    const ts = new Date(msg.timestamp);
    if (msg.direction === "incoming") lastCustomerReplyAt = ts;
    if (msg.direction === "outgoing" && isSuccessfulOutgoing(msg.status)) {
      lastAgentReplyAt = ts;
    }
  }

  const labels = Array.isArray(conv.labels) ? conv.labels : [];
  const hasGoodToGo = labels.includes(WHATSAPP_CRM_LABELS.GOOD_TO_GO);
  let hasVisit = false;
  if (conv.leadQueryId) {
    hasVisit = !!(await Visits.exists({ lead: conv.leadQueryId }));
  }

  const leadTemperature = computeLeadTemperature({
    customerMessageCount,
    agentMessageCount,
    lastMessageTime: conv.lastMessageTime,
    firstCustomerReplyAt,
    firstOutboundMessageAt,
    hasVisit,
    hasGoodToGo,
  });

  const engagementScore = computeEngagementScore({
    customerMessageCount,
    agentMessageCount,
    leadTemperature,
    slaBreached,
  });

  await WhatsAppConversation.updateOne(
    { _id: conversationId },
    {
      $set: {
        firstOutboundMessageAt,
        firstCustomerReplyAt,
        firstAgentReplyAt,
        customerMessageCount,
        agentMessageCount,
        lastCustomerReplyAt,
        lastAgentReplyAt,
        slaBreached,
        leadTemperature,
        engagementScore,
        openingTemplateName,
      },
    },
  );
}

/** Incremental update on incoming customer message. */
export async function recordIncomingMessageMetrics(
  conversationId: mongoose.Types.ObjectId | string,
  timestamp: Date,
): Promise<void> {
  const conv = await WhatsAppConversation.findById(conversationId)
    .select(
      "firstOutboundMessageAt firstCustomerReplyAt firstAgentReplyAt customerMessageCount agentMessageCount lastMessageTime labels leadQueryId",
    )
    .lean<IWhatsAppConversation | null>();
  if (!conv) return;

  const customerMessageCount = (conv.customerMessageCount ?? 0) + 1;
  const updates: Record<string, unknown> = {
    customerMessageCount,
    lastCustomerReplyAt: timestamp,
  };

  if (conv.firstOutboundMessageAt && !conv.firstCustomerReplyAt) {
    updates.firstCustomerReplyAt = timestamp;
  }

  let slaBreached = false;
  const firstCustomerReplyAt =
    (updates.firstCustomerReplyAt as Date) ?? conv.firstCustomerReplyAt;
  if (firstCustomerReplyAt && !conv.firstAgentReplyAt) {
    const elapsed = Date.now() - new Date(firstCustomerReplyAt).getTime();
    if (elapsed > SLA_RESPONSE_MINUTES * MS_PER_MINUTE) slaBreached = true;
  }

  const labels = Array.isArray(conv.labels) ? conv.labels : [];
  const leadTemperature = computeLeadTemperature({
    customerMessageCount,
    agentMessageCount: conv.agentMessageCount ?? 0,
    lastMessageTime: timestamp,
    firstCustomerReplyAt: firstCustomerReplyAt ?? undefined,
    firstOutboundMessageAt: conv.firstOutboundMessageAt,
    hasGoodToGo: labels.includes(WHATSAPP_CRM_LABELS.GOOD_TO_GO),
  });

  updates.leadTemperature = leadTemperature;
  updates.slaBreached = slaBreached;
  updates.engagementScore = computeEngagementScore({
    customerMessageCount,
    agentMessageCount: conv.agentMessageCount ?? 0,
    leadTemperature,
    slaBreached,
  });

  await WhatsAppConversation.updateOne({ _id: conversationId }, { $set: updates });

  if (updates.firstCustomerReplyAt) {
    const { confirmGuestInitiationOnInboundReply } = await import(
      "@/lib/whatsapp/initiationLimitService"
    );
    await confirmGuestInitiationOnInboundReply(String(conversationId)).catch(
      () => undefined,
    );
  }
}

/** Incremental update on outgoing agent/system message. */
export async function recordOutgoingMessageMetrics(
  conversationId: mongoose.Types.ObjectId | string,
  timestamp: Date,
  options?: { templateName?: string; isTemplate?: boolean },
): Promise<void> {
  const conv = await WhatsAppConversation.findById(conversationId)
    .select(
      "firstOutboundMessageAt firstCustomerReplyAt firstAgentReplyAt customerMessageCount agentMessageCount lastMessageTime openingTemplateName labels",
    )
    .lean<IWhatsAppConversation | null>();
  if (!conv) return;

  const agentMessageCount = (conv.agentMessageCount ?? 0) + 1;
  const updates: Record<string, unknown> = {
    agentMessageCount,
    lastAgentReplyAt: timestamp,
  };

  if (!conv.firstOutboundMessageAt) {
    updates.firstOutboundMessageAt = timestamp;
    if (options?.isTemplate && options.templateName) {
      updates.openingTemplateName = options.templateName;
    }
  }

  const hadCustomer =
    (conv.customerMessageCount ?? 0) > 0 || !!conv.firstCustomerReplyAt;
  if (hadCustomer && !conv.firstAgentReplyAt) {
    updates.firstAgentReplyAt = timestamp;
    const firstCustomerReplyAt = conv.firstCustomerReplyAt;
    if (firstCustomerReplyAt) {
      const agentMs =
        timestamp.getTime() - new Date(firstCustomerReplyAt).getTime();
      updates.slaBreached = agentMs > SLA_RESPONSE_MINUTES * MS_PER_MINUTE;
    }
  }

  const labels = Array.isArray(conv.labels) ? conv.labels : [];
  const customerMessageCount = conv.customerMessageCount ?? 0;
  const leadTemperature = computeLeadTemperature({
    customerMessageCount,
    agentMessageCount,
    lastMessageTime: timestamp,
    firstCustomerReplyAt: conv.firstCustomerReplyAt,
    firstOutboundMessageAt:
      (updates.firstOutboundMessageAt as Date) ?? conv.firstOutboundMessageAt,
    hasGoodToGo: labels.includes(WHATSAPP_CRM_LABELS.GOOD_TO_GO),
  });

  updates.leadTemperature = leadTemperature;
  updates.engagementScore = computeEngagementScore({
    customerMessageCount,
    agentMessageCount,
    leadTemperature,
    slaBreached: (updates.slaBreached as boolean) ?? false,
  });

  await WhatsAppConversation.updateOne({ _id: conversationId }, { $set: updates });
}

/** Percentile helper for sorted numeric arrays. */
export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
}

export function formatDurationMs(ms: number): string {
  if (ms <= 0) return "0m";
  const mins = Math.round(ms / MS_PER_MINUTE);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h < 24) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return rh > 0 ? `${d}d ${rh}h` : `${d}d`;
}

export async function countFunnelForConversations(
  conversationIds: mongoose.Types.ObjectId[],
): Promise<{ visits: number; goodToGo: number; bookings: number }> {
  if (conversationIds.length === 0) {
    return { visits: 0, goodToGo: 0, bookings: 0 };
  }

  const convs = await WhatsAppConversation.find({ _id: { $in: conversationIds } })
    .select("leadQueryId labels")
    .lean();

  const leadIds = convs
    .map((c) => c.leadQueryId)
    .filter((id): id is mongoose.Types.ObjectId => !!id);

  const goodToGo = convs.filter((c) =>
    (c.labels ?? []).includes(WHATSAPP_CRM_LABELS.GOOD_TO_GO),
  ).length;

  const [visitCount, bookingCount] = await Promise.all([
    leadIds.length > 0
      ? Visits.countDocuments({ lead: { $in: leadIds } })
      : Promise.resolve(0),
    leadIds.length > 0
      ? Bookings.countDocuments({ lead: { $in: leadIds } })
      : Promise.resolve(0),
  ]);

  return { visits: visitCount, goodToGo, bookings: bookingCount };
}
