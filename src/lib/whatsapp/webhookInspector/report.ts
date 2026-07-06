import WebhookInspectorEvent from "@/models/webhookInspectorEvent";
import WhatsAppMessage from "@/models/whatsappMessage";
import type {
  MessageDeliveryReport,
  TimelineEntry,
} from "./types";

type MessageLean = {
  messageId: string;
  conversationId: { toString(): string };
  businessPhoneId: string;
  status: string;
  direction: string;
  to: string;
  timestamp: Date;
  statusEvents?: Array<{ status: string; timestamp: Date }>;
};

export async function buildMessageDeliveryReport(
  messageId: string,
): Promise<MessageDeliveryReport | null> {
  const msg = (await WhatsAppMessage.findOne({ messageId })
    .select(
      "messageId conversationId businessPhoneId status statusEvents timestamp direction to",
    )
    .lean()) as MessageLean | null;

  if (!msg) return null;

  const inspectorEvents = await WebhookInspectorEvent.find({ messageId })
    .sort({ timestamp: 1 })
    .lean();

  const timeline: TimelineEntry[] = [];

  timeline.push({
    timestamp: new Date(msg.timestamp).toISOString(),
    stage: "Mongo message created",
    detail: `direction=${msg.direction} initial status=${msg.status}`,
    messageId,
    status: msg.status,
  });

  for (const ev of msg.statusEvents ?? []) {
    timeline.push({
      timestamp: new Date(ev.timestamp).toISOString(),
      stage: "Mongo statusEvents",
      detail: `status=${ev.status}`,
      status: ev.status,
      outcome: "mongo",
    });
  }

  for (const ev of inspectorEvents) {
    timeline.push({
      timestamp: new Date(ev.timestamp).toISOString(),
      stage: ev.eventType,
      detail: [
        ev.status,
        ev.outcome,
        ev.databaseUpdated != null ? `db=${ev.databaseUpdated}` : "",
        ev.socketEmitted ? "socket=1" : "",
        ev.inspectorErrors?.length ? ev.inspectorErrors.join(";") : "",
      ]
        .filter(Boolean)
        .join(" "),
      status: ev.status,
      outcome: ev.outcome,
      messageId: ev.messageId,
    });
  }

  timeline.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  const gaps: string[] = [];
  const mongoStatuses = new Set(
    (msg.statusEvents ?? []).map((e: { status: string }) => e.status),
  );
  const webhookStatuses = new Set(
    inspectorEvents
      .filter((e) => e.eventType === "status_received")
      .map((e) => e.status)
      .filter(Boolean) as string[],
  );

  const hasSent =
    mongoStatuses.has("sent") || webhookStatuses.has("sent") || msg.status === "sent";
  const hasDelivered =
    mongoStatuses.has("delivered") ||
    webhookStatuses.has("delivered") ||
    msg.status === "delivered" ||
    msg.status === "read";
  const hasRead =
    mongoStatuses.has("read") || webhookStatuses.has("read") || msg.status === "read";

  if (hasSent && !hasDelivered && msg.direction === "outgoing") {
    if (!webhookStatuses.has("delivered") && !mongoStatuses.has("delivered")) {
      gaps.push("sent recorded but delivered never received (Meta or webhook gap)");
    } else if (webhookStatuses.has("delivered") && !mongoStatuses.has("delivered")) {
      gaps.push("delivered webhook received but not in Mongo statusEvents");
    }
  }

  const processedDelivered = inspectorEvents.some(
    (e) =>
      e.eventType === "status_processed" &&
      e.newStatus === "delivered" &&
      e.databaseUpdated,
  );
  const socketDelivered = inspectorEvents.some(
    (e) =>
      e.eventType === "socket_emitted" &&
      e.status === "delivered",
  );

  if (mongoStatuses.has("delivered") && !socketDelivered && inspectorEvents.length > 0) {
    gaps.push("Mongo has delivered but no socket_emitted inspector record");
  }
  if (processedDelivered && !mongoStatuses.has("delivered")) {
    gaps.push("CRM reported db_updated for delivered but statusEvents missing it");
  }

  const notFound = inspectorEvents.some((e) => e.outcome === "message_not_found");
  if (notFound) {
    gaps.push("status webhook arrived before message existed in Mongo");
  }

  let conclusion: MessageDeliveryReport["conclusion"] = "inconclusive";

  if (gaps.length === 0 && (hasDelivered || hasRead)) {
    conclusion = "working";
  } else if (notFound) {
    conclusion = "crm_message_not_found";
  } else if (
    hasSent &&
    !hasDelivered &&
    !webhookStatuses.has("delivered")
  ) {
    conclusion = "meta_never_delivered";
  } else if (webhookStatuses.has("delivered") && !mongoStatuses.has("delivered")) {
    conclusion = "crm_db_not_updated";
  } else if (mongoStatuses.has("delivered") && !socketDelivered && inspectorEvents.length > 0) {
    conclusion = "crm_socket_gap";
  } else if (mongoStatuses.has("delivered") && msg.status === "sent") {
    conclusion = "ui_stale_possible";
  }

  return {
    messageId,
    customerPhone: msg.to,
    conversationId: String(msg.conversationId),
    businessPhoneId: msg.businessPhoneId,
    currentMongoStatus: msg.status,
    statusEvents: [
      ...(msg.statusEvents ?? []).map((e: { status: string; timestamp: Date }) => ({
        status: e.status,
        timestamp: new Date(e.timestamp).toISOString(),
        source: "mongo" as const,
      })),
      ...inspectorEvents
        .filter((e) => e.eventType === "status_received" && e.status)
        .map((e) => ({
          status: e.status!,
          timestamp: new Date(e.timestamp).toISOString(),
          source: "webhook_inspector" as const,
        })),
    ],
    timeline,
    gaps,
    conclusion,
    inspectorEventCount: inspectorEvents.length,
  };
}

export async function buildPhoneTimeline(
  customerPhone: string,
  limit = 200,
): Promise<TimelineEntry[]> {
  const events = await WebhookInspectorEvent.find({ customerPhone })
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();

  return events
    .map((ev) => ({
      timestamp: new Date(ev.timestamp).toISOString(),
      stage: ev.eventType,
      detail: [
        ev.status,
        ev.messageId,
        ev.outcome,
        ev.databaseUpdated != null ? `db=${ev.databaseUpdated}` : "",
        ev.socketEmitted ? "socket" : "",
      ]
        .filter(Boolean)
        .join(" | "),
      status: ev.status,
      outcome: ev.outcome,
      messageId: ev.messageId,
    }))
    .reverse();
}
