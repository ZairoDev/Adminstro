import mongoose, { Schema } from "mongoose";
import { type PaymentValidation } from "@/schemas/housingPayment.schema";

const PaymentSchema = new Schema<PaymentValidation>(
  {
    userId: { type: String, required: true, index: true },
    planId: { type: String, required: true, index: true },
    razorpayOrderId: { type: String, required: true },
    addressKey: { type: String, required: true, index: true },
    couponCode: { type: String, required: false, index: true },
    razorpayPaymentId: { type: String, required: false },
    razorpaySignature: { type: String, required: false },
    amountEuro: { type: Number, required: true },
    currency: { type: String, required: true, default: "EUR" },
    status: { type: String, required: true, default: "created" },
    failureReason: { type: String, required: false },
    verifiedAt: { type: Date, required: false },
    capturedAt: { type: Date, required: false },
    source: { type: String, required: false, enum: ["verify", "webhook"] },
  },
  { timestamps: true },
);

PaymentSchema.index({ razorpayOrderId: 1 }, { unique: true, sparse: true });
PaymentSchema.index({ userId: 1, addressKey: 1, status: 1 });

// In dev (Next.js hot reload), mongoose model cache can hold a stale schema.
// Delete before registering so schema changes (e.g. field renames) are applied.
// Guard: mongoose.models is not available in the browser if this file is ever imported client-side.
if (mongoose.models && typeof mongoose.models === "object") {
  delete (mongoose.models as Record<string, unknown>).Payment;
}

export const Payment: mongoose.Model<PaymentValidation> = mongoose.model<PaymentValidation>(
  "Payment",
  PaymentSchema,
);

