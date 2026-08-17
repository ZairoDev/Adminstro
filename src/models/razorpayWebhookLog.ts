import mongoose, { Schema, type Document, type Model } from "mongoose";
import type { RazorpayWebhookLogValidation } from "@/schemas/razorpayWebhookLog.schema";

export type RazorpayWebhookLogStatus =
  RazorpayWebhookLogValidation["status"];

export interface IRazorpayWebhookLog extends Document {
  event?: string;
  signature?: string;
  signatureVerified: boolean;
  headers?: Record<string, unknown>;
  payload?: unknown;
  receivedAt: Date;
  processed: boolean;
  processedAt?: Date;
  status: RazorpayWebhookLogStatus;
  error?: string;
  retryCount: number;
  paymentId?: string;
  paymentLinkId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const razorpayWebhookLogSchema = new Schema<IRazorpayWebhookLog>(
  {
    event: { type: String, index: true },
    signature: { type: String },
    signatureVerified: { type: Boolean, default: false },
    headers: { type: Schema.Types.Mixed },
    payload: { type: Schema.Types.Mixed },
    receivedAt: { type: Date, required: true, index: true },
    processed: { type: Boolean, default: false, index: true },
    processedAt: { type: Date },
    status: {
      type: String,
      enum: ["received", "invalid_signature", "processed", "ignored", "error"],
      default: "received",
      index: true,
    },
    error: { type: String },
    retryCount: { type: Number, default: 0 },
    paymentId: { type: String, index: true },
    paymentLinkId: { type: String, index: true },
  },
  { timestamps: true },
);

razorpayWebhookLogSchema.index({ receivedAt: -1 });
razorpayWebhookLogSchema.index({ event: 1, receivedAt: -1 });

if (mongoose.models && typeof mongoose.models === "object") {
  delete (mongoose.models as Record<string, unknown>).RazorpayWebhookLog;
}

const RazorpayWebhookLog: Model<IRazorpayWebhookLog> =
  mongoose.model<IRazorpayWebhookLog>(
    "RazorpayWebhookLog",
    razorpayWebhookLogSchema,
  );

export default RazorpayWebhookLog;
