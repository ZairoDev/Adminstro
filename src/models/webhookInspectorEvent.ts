import mongoose, { Schema, Document } from "mongoose";
import type {
  WebhookInspectorEventType,
  WebhookInspectorOutcome,
} from "@/lib/whatsapp/webhookInspector/types";

export interface IWebhookInspectorEvent extends Document {
  timestamp: Date;
  eventType: WebhookInspectorEventType;
  webhookType?: string;
  status?: string;
  messageId?: string;
  businessPhoneId?: string;
  wabaId?: string;
  customerPhone?: string;
  conversationFound?: boolean;
  conversationId?: string;
  messageFound?: boolean;
  mongoMessageId?: string;
  previousStatus?: string;
  newStatus?: string;
  databaseUpdated?: boolean;
  socketEmitted?: boolean;
  outcome?: WebhookInspectorOutcome;
  inspectorErrors?: string[];
  rawPayload?: Record<string, unknown>;
  meta?: Record<string, unknown>;
}

const webhookInspectorEventSchema = new Schema<IWebhookInspectorEvent>(
  {
    timestamp: { type: Date, required: true, index: true },
    eventType: { type: String, required: true, index: true },
    webhookType: String,
    status: { type: String, index: true },
    messageId: { type: String, index: true },
    businessPhoneId: { type: String, index: true },
    wabaId: String,
    customerPhone: { type: String, index: true },
    conversationFound: Boolean,
    conversationId: { type: String, index: true },
    messageFound: Boolean,
    mongoMessageId: String,
    previousStatus: String,
    newStatus: String,
    databaseUpdated: Boolean,
    socketEmitted: Boolean,
    outcome: String,
    inspectorErrors: [String],
    rawPayload: Schema.Types.Mixed,
    meta: Schema.Types.Mixed,
  },
  { timestamps: true },
);

webhookInspectorEventSchema.index({ messageId: 1, timestamp: 1 });
webhookInspectorEventSchema.index({ customerPhone: 1, timestamp: -1 });
webhookInspectorEventSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 7 * 24 * 60 * 60 },
);

const WebhookInspectorEvent =
  mongoose.models.WebhookInspectorEvent ||
  mongoose.model<IWebhookInspectorEvent>(
    "WebhookInspectorEvent",
    webhookInspectorEventSchema,
  );

export default WebhookInspectorEvent;
