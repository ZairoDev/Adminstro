import { connectDb } from "@/util/db";
import WebhookInspectorEvent from "@/models/webhookInspectorEvent";
import { getWebhookInspectorFilter } from "./config";
import { matchesInspectorFilter } from "./filter";
import type {
  WebhookInspectorEventRecord,
  WebhookInspectorOutcome,
} from "./types";

function consoleLine(record: WebhookInspectorEventRecord): void {
  const parts = [
    `[webhook-inspector]`,
    record.eventType,
    record.status ?? "",
    record.messageId ?? "",
    record.outcome ?? "",
    record.databaseUpdated != null ? `db=${record.databaseUpdated}` : "",
    record.socketEmitted != null ? `socket=${record.socketEmitted}` : "",
  ].filter(Boolean);
  console.log(parts.join(" "));
}

/** Persist + console-log a single inspector event (filtered customers only). */
export async function recordWebhookInspectorEvent(
  partial: Omit<WebhookInspectorEventRecord, "timestamp">,
): Promise<void> {
  const filter = getWebhookInspectorFilter();
  if (!filter.enabled) return;

  const fields = {
    customerPhone: partial.customerPhone,
    messageId: partial.messageId,
    businessPhoneId: partial.businessPhoneId,
    conversationId: partial.conversationId,
  };

  if (!matchesInspectorFilter(filter, fields)) {
    return;
  }

  const record: WebhookInspectorEventRecord = {
    timestamp: new Date(),
    ...partial,
  };

  consoleLine(record);

  try {
    await connectDb();
    await WebhookInspectorEvent.create(record);
  } catch (err) {
    console.error("[webhook-inspector] failed to persist event:", err);
  }
}

/** Record raw Meta status webhook before processing. */
export async function recordRawStatusWebhook(params: {
  status: Record<string, unknown>;
  businessPhoneId?: string;
  wabaId?: string;
}): Promise<void> {
  const messageId = String(params.status.id ?? "");
  const customerPhone = String(params.status.recipient_id ?? "");
  const status = String(params.status.status ?? "");

  await recordWebhookInspectorEvent({
    eventType: "status_received",
    webhookType: "messages.statuses",
    status,
    messageId,
    businessPhoneId: params.businessPhoneId,
    wabaId: params.wabaId,
    customerPhone,
    rawPayload: params.status,
    outcome: "recorded",
  });
}

/** Record outcome after processStatusUpdate completes (read-only verification). */
export async function recordStatusProcessingOutcome(params: {
  messageId: string;
  newStatus: string;
  recipientId?: string;
  previousStatus?: string;
  messageFound: boolean;
  mongoMessageId?: string;
  conversationId?: string;
  databaseUpdated: boolean;
  outcome: WebhookInspectorOutcome;
  inspectorErrors?: string[];
}): Promise<void> {
  await recordWebhookInspectorEvent({
    eventType: "status_processed",
    webhookType: "messages.statuses",
    status: params.newStatus,
    messageId: params.messageId,
    customerPhone: params.recipientId,
    conversationFound: Boolean(params.conversationId),
    conversationId: params.conversationId,
    messageFound: params.messageFound,
    mongoMessageId: params.mongoMessageId,
    previousStatus: params.previousStatus,
    newStatus: params.newStatus,
    databaseUpdated: params.databaseUpdated,
    outcome: params.outcome,
    inspectorErrors: params.inspectorErrors,
  });
}

/** Called from emitWhatsAppEvent when MESSAGE_STATUS_UPDATE fires. */
export async function recordStatusSocketEmit(params: {
  conversationId?: string;
  messageId?: string;
  status?: string;
  recipientId?: string;
}): Promise<void> {
  await recordWebhookInspectorEvent({
    eventType: "socket_emitted",
    webhookType: "whatsapp-message-status",
    messageId: params.messageId,
    conversationId: params.conversationId,
    customerPhone: params.recipientId,
    status: params.status,
    socketEmitted: true,
    outcome: "recorded",
  });
}

/** Record outbound send from API (optional — call from send routes if needed). */
export async function recordSendApiEvent(params: {
  messageId: string;
  customerPhone: string;
  businessPhoneId: string;
  conversationId: string;
  source: string;
}): Promise<void> {
  await recordWebhookInspectorEvent({
    eventType: "send_api",
    messageId: params.messageId,
    customerPhone: params.customerPhone,
    businessPhoneId: params.businessPhoneId,
    conversationId: params.conversationId,
    status: "sent",
    databaseUpdated: true,
    outcome: "recorded",
    meta: { source: params.source },
  });
}
