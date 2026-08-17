import mongoose, { Schema, type Document, type Model } from "mongoose";
import type {
  FinancePaymentStatus,
  MappingHistoryEntry,
} from "@/schemas/financePayment.schema";

export interface IFinancePayment extends Document {
  paymentId?: string;
  paymentLinkId?: string;
  orderId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerPhoneNormalized?: string;
  amount: number;
  currency: string;
  status: FinancePaymentStatus;
  method?: string;
  bank?: string;
  wallet?: string;
  upi?: string;
  card?: Record<string, unknown>;
  fee?: number;
  tax?: number;
  netAmount?: number;
  notes?: Record<string, unknown>;
  description?: string;
  shortUrl?: string;
  createdAtRazorpay?: Date;
  authorizedAt?: Date;
  capturedAt?: Date;
  paidAt?: Date;
  failedAt?: Date;
  mapped: boolean;
  mappedAt?: Date;
  mappedBy?: string;
  mappedByName?: string;
  bookingId?: string;
  bookingObjectId?: string;
  guestId?: string;
  guestName?: string;
  guestEmail?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  propertyId?: string;
  ownerId?: string;
  mappingHistory: MappingHistoryEntry[];
  /** Finance invoice pipeline */
  invoiceStatus: "not_generated" | "generated" | "sent" | "failed";
  invoiceIds: string[];
  invoiceNumbers: string[];
  paymentClassification?: "complete" | "partial" | "split";
  pendingAmount?: number;
  discountGiven?: number;
  splitAllocations?: Array<{
    guestId?: string;
    guestName?: string;
    guestEmail?: string;
    amount: number;
  }>;
  metadata?: Record<string, unknown>;
  rawPayload?: unknown;
  source: "webhook" | "sync" | "manual";
  lastEvent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const mappingHistorySchema = new Schema(
  {
    mappedBy: { type: String, required: true },
    mappedByName: { type: String },
    mappedAt: { type: Date, required: true },
    previousBookingId: { type: String },
    newBookingId: { type: String },
    previousGuestId: { type: String },
    newGuestId: { type: String },
    reason: { type: String },
  },
  { _id: false },
);

const financePaymentSchema = new Schema<IFinancePayment>(
  {
    paymentId: { type: String },
    paymentLinkId: { type: String },
    orderId: { type: String },
    customerName: { type: String },
    customerEmail: { type: String },
    customerPhone: { type: String },
    customerPhoneNormalized: { type: String },
    amount: { type: Number, required: true, default: 0 },
    currency: { type: String, default: "INR" },
    status: {
      type: String,
      enum: [
        "created",
        "authorized",
        "captured",
        "paid",
        "partially_paid",
        "failed",
        "cancelled",
        "expired",
        "refunded",
      ],
      default: "created",
    },
    method: { type: String },
    bank: { type: String },
    wallet: { type: String },
    upi: { type: String },
    card: { type: Schema.Types.Mixed },
    fee: { type: Number },
    tax: { type: Number },
    netAmount: { type: Number },
    notes: { type: Schema.Types.Mixed },
    description: { type: String },
    shortUrl: { type: String },
    createdAtRazorpay: { type: Date },
    authorizedAt: { type: Date },
    capturedAt: { type: Date },
    paidAt: { type: Date },
    failedAt: { type: Date },
    mapped: { type: Boolean, default: false },
    mappedAt: { type: Date },
    mappedBy: { type: String },
    mappedByName: { type: String },
    bookingId: { type: String },
    bookingObjectId: { type: String },
    guestId: { type: String },
    guestName: { type: String },
    guestEmail: { type: String },
    invoiceId: { type: String },
    invoiceNumber: { type: String },
    propertyId: { type: String },
    ownerId: { type: String },
    mappingHistory: { type: [mappingHistorySchema], default: [] },
    invoiceStatus: {
      type: String,
      enum: ["not_generated", "generated", "sent", "failed"],
      default: "not_generated",
    },
    invoiceIds: [{ type: String }],
    invoiceNumbers: [{ type: String }],
    paymentClassification: {
      type: String,
      enum: ["complete", "partial", "split"],
    },
    pendingAmount: { type: Number },
    discountGiven: { type: Number },
    splitAllocations: [
      {
        guestId: { type: String },
        guestName: { type: String },
        guestEmail: { type: String },
        amount: { type: Number },
        _id: false,
      },
    ],
    metadata: { type: Schema.Types.Mixed },
    rawPayload: { type: Schema.Types.Mixed },
    source: {
      type: String,
      enum: ["webhook", "sync", "manual"],
      default: "webhook",
    },
    lastEvent: { type: String },
  },
  { timestamps: true },
);

financePaymentSchema.index({ paymentId: 1 }, { unique: true, sparse: true });
financePaymentSchema.index({ paymentLinkId: 1 });
financePaymentSchema.index({ mapped: 1, createdAt: -1 });
financePaymentSchema.index({ status: 1, createdAt: -1 });
financePaymentSchema.index({ customerPhoneNormalized: 1, createdAt: -1 });
financePaymentSchema.index({ paidAt: -1 });
financePaymentSchema.index({ invoiceStatus: 1 });

if (mongoose.models && typeof mongoose.models === "object") {
  delete (mongoose.models as Record<string, unknown>).FinancePayment;
}

const FinancePayment: Model<IFinancePayment> =
  mongoose.model<IFinancePayment>("FinancePayment", financePaymentSchema);

export default FinancePayment;
