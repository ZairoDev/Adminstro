import { connectDb } from "@/util/db";
import WhatsAppWebhookLog, {
  type WhatsAppWebhookLogKind,
  type WhatsAppWebhookProcessingStatus,
  type WhatsAppWebhookSignatureStatus,
} from "@/models/whatsappWebhookLog";
import { normalizePhone } from "@/lib/whatsapp/normalizePhone";

function isEnabled(): boolean {
  const v = process.env.WEBHOOK_LOG_ENABLED?.trim().toLowerCase();
  if (v === "0" || v === "false" || v === "no") return false;
  return true;
}

function metaTimestamp(value: unknown): Date | undefined {
  if (value == null) return undefined;
  const n = typeof value === "string" ? parseInt(value, 10) : Number(value);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return new Date(n * 1000);
}

type WebhookBody = {
  object?: string;
  entry?: Array<{
    id?: string;
    changes?: Array<{
      field?: string;
      value?: Record<string, unknown>;
    }>;
  }>;
};

type WebhookLogRow = {
  receivedAt: Date;
  eventAt?: Date;
  field: string;
  kind: WhatsAppWebhookLogKind;
  status?: string;
  messageId?: string;
  businessPhoneId?: string;
  wabaId?: string;
  customerPhone?: string;
  messageType?: string;
  preview?: string;
  signatureStatus?: WhatsAppWebhookSignatureStatus;
  processingStatus?: WhatsAppWebhookProcessingStatus;
  payload?: Record<string, unknown>;
};

const PREVIEW_MAX = 140;

/** Short text preview of a Meta inbound message payload (for the monitor UI). */
function buildInboundPreview(msg: Record<string, unknown>): string | undefined {
  const type = String(msg.type ?? "");
  const asRecord = (v: unknown): Record<string, unknown> | undefined =>
    v && typeof v === "object" ? (v as Record<string, unknown>) : undefined;

  let text: string | undefined;
  switch (type) {
    case "text":
      text = asRecord(msg.text)?.body as string | undefined;
      break;
    case "button": {
      const b = asRecord(msg.button);
      text = (b?.text ?? b?.payload) as string | undefined;
      break;
    }
    case "interactive": {
      const i = asRecord(msg.interactive);
      const reply = asRecord(i?.button_reply) ?? asRecord(i?.list_reply);
      text = (reply?.title ?? reply?.id) as string | undefined;
      break;
    }
    case "image":
    case "video":
    case "document":
      text =
        (asRecord(msg[type])?.caption as string | undefined) || `[${type}]`;
      break;
    case "reaction":
      text = `Reacted ${String(asRecord(msg.reaction)?.emoji ?? "")}`;
      break;
    case "unsupported":
      text = "[unsupported message type]";
      break;
    default:
      text = type ? `[${type}]` : undefined;
  }
  return text ? String(text).slice(0, PREVIEW_MAX) : undefined;
}

export type PersistWebhookOptions = {
  signatureStatus?: WhatsAppWebhookSignatureStatus;
};

/**
 * Persist every webhook sub-event from a Meta POST body.
 * Must be AWAITED by the caller before processing starts so the outcome
 * updates (recordInboundProcessingOutcome) always find their row.
 */
export async function persistWebhookPayload(
  body: unknown,
  options: PersistWebhookOptions = {},
): Promise<number> {
  if (!isEnabled()) return 0;

  const parsed = body as WebhookBody;
  if (parsed?.object !== "whatsapp_business_account") return 0;

  const receivedAt = new Date();
  const signatureStatus = options.signatureStatus;
  const rows: WebhookLogRow[] = [];

  for (const entry of parsed.entry ?? []) {
    const wabaId = entry.id ? String(entry.id) : undefined;

    for (const change of entry.changes ?? []) {
      const field = String(change.field ?? "unknown");
      const value = (change.value ?? {}) as Record<string, unknown>;
      const metadata = value.metadata as { phone_number_id?: string } | undefined;
      const businessPhoneId = metadata?.phone_number_id
        ? String(metadata.phone_number_id)
        : undefined;

      const statuses = Array.isArray(value.statuses) ? value.statuses : [];
      for (const st of statuses) {
        const statusObj = st as Record<string, unknown>;
        const customerPhone = statusObj.recipient_id
          ? normalizePhone(String(statusObj.recipient_id))
          : undefined;
        rows.push({
          receivedAt,
          eventAt: metaTimestamp(statusObj.timestamp),
          field,
          kind: field === "calls" ? "call" : "status",
          status: statusObj.status ? String(statusObj.status) : undefined,
          messageId: statusObj.id ? String(statusObj.id) : undefined,
          businessPhoneId,
          wabaId,
          customerPhone,
          signatureStatus,
          payload: statusObj,
        });
      }

      const messages = Array.isArray(value.messages) ? value.messages : [];
      // smb_message_echoes carries messages SENT BY the business — not customer replies.
      const isEchoField = field === "smb_message_echoes";
      for (const msg of messages) {
        const msgObj = msg as Record<string, unknown>;
        const party = isEchoField ? msgObj.to : msgObj.from;
        const customerPhone = party ? normalizePhone(String(party)) : undefined;
        rows.push({
          receivedAt,
          eventAt: metaTimestamp(msgObj.timestamp),
          field,
          kind: isEchoField ? "message_echo" : "inbound_message",
          messageId: msgObj.id ? String(msgObj.id) : undefined,
          businessPhoneId,
          wabaId,
          customerPhone,
          messageType: msgObj.type ? String(msgObj.type) : undefined,
          preview: buildInboundPreview(msgObj),
          signatureStatus,
          ...(isEchoField ? {} : { processingStatus: "pending" as const }),
          payload: msgObj,
        });
      }

      const echoes = Array.isArray(value.message_echoes)
        ? value.message_echoes
        : [];
      for (const echo of echoes) {
        const echoObj = echo as Record<string, unknown>;
        const to = echoObj.to ? normalizePhone(String(echoObj.to)) : undefined;
        rows.push({
          receivedAt,
          eventAt: metaTimestamp(echoObj.timestamp),
          field,
          kind: "message_echo",
          messageId: echoObj.id ? String(echoObj.id) : undefined,
          businessPhoneId,
          wabaId,
          customerPhone: to,
          signatureStatus,
          payload: echoObj,
        });
      }

      if (
        statuses.length === 0 &&
        messages.length === 0 &&
        echoes.length === 0
      ) {
        const kind: WhatsAppWebhookLogKind =
          field === "calls"
            ? "call"
            : field === "history"
              ? "history"
              : field === "smb_app_state_sync"
                ? "app_state_sync"
                : "other";

        rows.push({
          receivedAt,
          field,
          kind,
          businessPhoneId,
          wabaId,
          signatureStatus,
          payload: value,
        });
      }
    }
  }

  if (rows.length === 0) return 0;

  await connectDb();
  await WhatsAppWebhookLog.insertMany(rows, { ordered: false });
  return rows.length;
}

export type InboundProcessingOutcome = {
  messageId?: string;
  businessPhoneId?: string;
  processingStatus: Exclude<WhatsAppWebhookProcessingStatus, "pending">;
  processingReason?: string;
  processingError?: string;
  conversationId?: string;
  mongoMessageId?: string;
  eligibleUserCount?: number;
  socketEmittedCount?: number;
};

/**
 * Stamp what the handler did with an inbound message onto its webhook-log row.
 * Never throws — diagnostics must not break message handling.
 */
export async function recordInboundProcessingOutcome(
  outcome: InboundProcessingOutcome,
): Promise<void> {
  if (!isEnabled() || !outcome.messageId) return;
  try {
    await connectDb();
    await WhatsAppWebhookLog.updateMany(
      {
        kind: "inbound_message",
        messageId: outcome.messageId,
        ...(outcome.businessPhoneId
          ? { businessPhoneId: outcome.businessPhoneId }
          : {}),
        // Meta retries: don't let a later "duplicate" overwrite the real outcome.
        ...(outcome.processingStatus === "duplicate"
          ? { processingStatus: { $in: ["pending", "duplicate"] } }
          : {}),
      },
      {
        $set: {
          processingStatus: outcome.processingStatus,
          processingReason: outcome.processingReason,
          processingError: outcome.processingError?.slice(0, 500),
          processedAt: new Date(),
          conversationId: outcome.conversationId,
          mongoMessageId: outcome.mongoMessageId,
          eligibleUserCount: outcome.eligibleUserCount,
          socketEmittedCount: outcome.socketEmittedCount,
        },
      },
    );
  } catch (err) {
    console.warn("[webhook-log] failed to record inbound outcome:", err);
  }
}

export type WebhookLogStats = {
  since: string;
  totalAll: number;
  phone?: string;
  phoneTotal: number;
  byStatus: Record<string, number>;
  byKind: Record<string, number>;
  recent: Array<{
    receivedAt: string;
    eventAt?: string;
    kind: string;
    status?: string;
    messageId?: string;
    field: string;
  }>;
};

export async function getWebhookLogStats(params: {
  phone?: string;
  days?: number;
  recentLimit?: number;
}): Promise<WebhookLogStats> {
  const days = params.days ?? 7;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const recentLimit = params.recentLimit ?? 30;

  await connectDb();

  const baseMatch = { receivedAt: { $gte: since } };

  const [totalAll, phoneAgg, statusAgg, kindAgg, recent] = await Promise.all([
    WhatsAppWebhookLog.countDocuments(baseMatch),
    params.phone
      ? WhatsAppWebhookLog.aggregate<{ count: number }>([
          {
            $match: {
              ...baseMatch,
              customerPhone: normalizePhone(params.phone),
            },
          },
          { $count: "count" },
        ])
      : Promise.resolve([]),
    params.phone
      ? WhatsAppWebhookLog.aggregate<{ _id: string; count: number }>([
          {
            $match: {
              ...baseMatch,
              customerPhone: normalizePhone(params.phone),
              status: { $exists: true, $ne: null },
            },
          },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ])
      : WhatsAppWebhookLog.aggregate<{ _id: string; count: number }>([
          {
            $match: { ...baseMatch, status: { $exists: true, $ne: null } },
          },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
    params.phone
      ? WhatsAppWebhookLog.aggregate<{ _id: string; count: number }>([
          {
            $match: {
              ...baseMatch,
              customerPhone: normalizePhone(params.phone),
            },
          },
          { $group: { _id: "$kind", count: { $sum: 1 } } },
        ])
      : WhatsAppWebhookLog.aggregate<{ _id: string; count: number }>([
          { $match: baseMatch },
          { $group: { _id: "$kind", count: { $sum: 1 } } },
        ]),
    params.phone
      ? WhatsAppWebhookLog.find({
          ...baseMatch,
          customerPhone: normalizePhone(params.phone),
        })
          .sort({ receivedAt: -1 })
          .limit(recentLimit)
          .select("receivedAt eventAt kind status messageId field")
          .lean()
      : WhatsAppWebhookLog.find(baseMatch)
          .sort({ receivedAt: -1 })
          .limit(recentLimit)
          .select("receivedAt eventAt kind status messageId field customerPhone")
          .lean(),
  ]);

  const byStatus: Record<string, number> = {};
  for (const row of statusAgg) {
    if (row._id) byStatus[row._id] = row.count;
  }

  const byKind: Record<string, number> = {};
  for (const row of kindAgg) {
    if (row._id) byKind[row._id] = row.count;
  }

  return {
    since: since.toISOString(),
    totalAll,
    phone: params.phone ? normalizePhone(params.phone) : undefined,
    phoneTotal: phoneAgg[0]?.count ?? 0,
    byStatus,
    byKind,
    recent: recent.map((r) => ({
      receivedAt: new Date(r.receivedAt).toISOString(),
      eventAt: r.eventAt ? new Date(r.eventAt).toISOString() : undefined,
      kind: r.kind,
      status: r.status,
      messageId: r.messageId,
      field: r.field,
      ...("customerPhone" in r && r.customerPhone
        ? { customerPhone: r.customerPhone as string }
        : {}),
    })),
  };
}
