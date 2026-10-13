import mongoose, { Schema, Document } from "mongoose";

export type WhatsAppWebhookLogKind =
  | "status"
  | "inbound_message"
  | "message_echo"
  | "call"
  | "history"
  | "app_state_sync"
  | "other";

/**
 * What our handler did with a webhook row.
 * - pending: row stored, handler has not finished yet (or the process died mid-way)
 * - saved: new inbound message stored in WhatsAppMessage
 * - duplicate: message already existed (Meta retry) — nothing lost
 * - dropped: handler intentionally returned early WITHOUT storing (see processingReason)
 * - error: handler threw — message was NOT stored
 */
export type WhatsAppWebhookProcessingStatus =
  | "pending"
  | "saved"
  | "duplicate"
  | "dropped"
  | "error";

export type WhatsAppWebhookSignatureStatus =
  | "valid"
  | "invalid"
  | "missing_header"
  | "unchecked";

export interface IWhatsAppWebhookLog extends Document {
  /** Server receive time */
  receivedAt: Date;
  /** Meta event time when available */
  eventAt?: Date;
  field: string;
  kind: WhatsAppWebhookLogKind;
  status?: string;
  messageId?: string;
  businessPhoneId?: string;
  wabaId?: string;
  /** Normalized digits-only customer phone */
  customerPhone?: string;
  /** Meta message type (text, image, button, unsupported, ...) for inbound rows */
  messageType?: string;
  /** Short human-readable preview of an inbound message */
  preview?: string;
  payload?: Record<string, unknown>;

  /** HMAC verification result of the delivery this row came from */
  signatureStatus?: WhatsAppWebhookSignatureStatus;

  // ── Processing outcome (inbound_message rows) ──────────────────────────
  processingStatus?: WhatsAppWebhookProcessingStatus;
  processingReason?: string;
  processingError?: string;
  processedAt?: Date;
  conversationId?: string;
  mongoMessageId?: string;
  /** Employees eligible to be notified for this message */
  eligibleUserCount?: number;
  /** Socket notifications emitted for this message */
  socketEmittedCount?: number;
}

const whatsappWebhookLogSchema = new Schema<IWhatsAppWebhookLog>(
  {
    receivedAt: { type: Date, required: true, index: true },
    eventAt: { type: Date, index: true },
    field: { type: String, required: true, index: true },
    kind: { type: String, required: true, index: true },
    status: { type: String, index: true },
    messageId: { type: String, index: true },
    businessPhoneId: { type: String, index: true },
    wabaId: String,
    customerPhone: { type: String, index: true },
    messageType: String,
    preview: String,
    payload: Schema.Types.Mixed,
    signatureStatus: String,
    processingStatus: { type: String, index: true },
    processingReason: String,
    processingError: String,
    processedAt: Date,
    conversationId: { type: String, index: true },
    mongoMessageId: String,
    eligibleUserCount: Number,
    socketEmittedCount: Number,
  },
  { timestamps: true },
);

whatsappWebhookLogSchema.index({ customerPhone: 1, receivedAt: -1 });
whatsappWebhookLogSchema.index({ kind: 1, receivedAt: -1 });
whatsappWebhookLogSchema.index({ kind: 1, processingStatus: 1, receivedAt: -1 });
whatsappWebhookLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 },
);

const WhatsAppWebhookLog =
  mongoose.models.WhatsAppWebhookLog ||
  mongoose.model<IWhatsAppWebhookLog>(
    "WhatsAppWebhookLog",
    whatsappWebhookLogSchema,
  );

export default WhatsAppWebhookLog;
