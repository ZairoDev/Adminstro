import mongoose, { Schema, Document, Types } from "mongoose";

export type WhatsAppCallDirection = "business_initiated" | "user_initiated";

export type WhatsAppCallLifecycleStatus =
  | "signaling"
  | "ringing"
  | "connected"
  | "ended"
  | "failed"
  | "missed"
  | "declined"
  | "busy"
  | "timeout";

export interface IWhatsAppCallLog extends Document {
  callId: string;
  conversationId?: Types.ObjectId;
  businessPhoneId?: string;
  participantPhone?: string;
  participantName?: string;
  direction: WhatsAppCallDirection;
  lifecycleStatus: WhatsAppCallLifecycleStatus;
  /** SHA-256 hex of last SDP answer payload we emitted to clients (dedup). */
  lastEmittedSdpAnswerHash?: string;
  lastEmittedSdpAnswerAt?: Date;
  metaCallStatus?: string;
  startedAt: Date;
  endedAt?: Date;
  durationSeconds?: number;
  disconnectReason?: string;
  lastClientStats?: Record<string, unknown>;
  updatedAt: Date;
}

const whatsAppCallLogSchema = new Schema<IWhatsAppCallLog>(
  {
    callId: { type: String, required: true },
    conversationId: { type: Schema.Types.ObjectId, ref: "WhatsAppConversation", index: true },
    businessPhoneId: { type: String, index: true },
    participantPhone: { type: String },
    participantName: { type: String },
    direction: {
      type: String,
      enum: ["business_initiated", "user_initiated"],
      default: "business_initiated",
    },
    lifecycleStatus: {
      type: String,
      enum: [
        "signaling",
        "ringing",
        "connected",
        "ended",
        "failed",
        "missed",
        "declined",
        "busy",
        "timeout",
      ],
      default: "signaling",
    },
    lastEmittedSdpAnswerHash: { type: String },
    lastEmittedSdpAnswerAt: { type: Date },
    metaCallStatus: { type: String },
    startedAt: { type: Date, required: true, default: () => new Date() },
    endedAt: { type: Date },
    durationSeconds: { type: Number },
    disconnectReason: { type: String },
    lastClientStats: { type: Schema.Types.Mixed },
    updatedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: false },
);

whatsAppCallLogSchema.index({ callId: 1 }, { unique: true });
whatsAppCallLogSchema.index({ businessPhoneId: 1, startedAt: -1 });
whatsAppCallLogSchema.index({ conversationId: 1, startedAt: -1 });

const WhatsAppCallLog =
  mongoose.models.WhatsAppCallLog ||
  mongoose.model<IWhatsAppCallLog>("WhatsAppCallLog", whatsAppCallLogSchema);

export default WhatsAppCallLog;
