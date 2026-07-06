import mongoose, { Schema, Document } from "mongoose";

export type WhatsAppWebhookLogKind =
  | "status"
  | "inbound_message"
  | "message_echo"
  | "call"
  | "history"
  | "app_state_sync"
  | "other";

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
  payload?: Record<string, unknown>;
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
    payload: Schema.Types.Mixed,
  },
  { timestamps: true },
);

whatsappWebhookLogSchema.index({ customerPhone: 1, receivedAt: -1 });
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
