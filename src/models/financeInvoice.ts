import mongoose, { Schema, type Document, type Model } from "mongoose";

export type FinanceInvoiceStatus = "generated" | "sent" | "failed" | "superseded";
export type FinanceInvoiceClassification = "complete" | "partial" | "split";

export interface IFinanceInvoice extends Document {
  invoiceNumber: string;
  /** paymentId or paymentLinkId from FinancePayment */
  financePaymentId?: string;
  financePaymentObjectId?: string;
  bookingObjectId?: string;
  bookingId?: string;
  guestId?: string;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  classification: FinanceInvoiceClassification;
  amountBilled: number;
  currency: string;
  /** Only for complete payments where paidAmount < amountDue */
  discountGiven?: number;
  discountReason?: string;
  /** Only for partial payments */
  pendingAmount?: number;
  /** Links sibling invoices from the same split payment */
  splitGroupId?: string;
  /** Total split payment amount across all siblings */
  splitTotalAmount?: number;
  /** Guest's amountDue snapshot before this transaction */
  amountDueSnapshot?: number;
  status: FinanceInvoiceStatus;
  emailedAt?: Date;
  emailError?: string;
  generatedBy?: string;
  generatedByName?: string;
  sentBy?: string;
  sentByName?: string;
  notes?: string;
  /** Snapshot data for deterministic PDF regeneration */
  propertyName?: string;
  propertyAddress?: string;
  checkIn?: Date;
  checkOut?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const financeInvoiceSchema = new Schema<IFinanceInvoice>(
  {
    invoiceNumber: { type: String, required: true },
    financePaymentId: { type: String },
    financePaymentObjectId: { type: String },
    bookingObjectId: { type: String },
    bookingId: { type: String },
    guestId: { type: String },
    guestName: { type: String },
    guestEmail: { type: String },
    guestPhone: { type: String },
    classification: {
      type: String,
      enum: ["complete", "partial", "split"],
      required: true,
    },
    amountBilled: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    discountGiven: { type: Number },
    discountReason: { type: String },
    pendingAmount: { type: Number },
    splitGroupId: { type: String },
    splitTotalAmount: { type: Number },
    amountDueSnapshot: { type: Number },
    status: {
      type: String,
      enum: ["generated", "sent", "failed", "superseded"],
      default: "generated",
    },
    emailedAt: { type: Date },
    emailError: { type: String },
    generatedBy: { type: String },
    generatedByName: { type: String },
    sentBy: { type: String },
    sentByName: { type: String },
    notes: { type: String },
    propertyName: { type: String },
    propertyAddress: { type: String },
    checkIn: { type: Date },
    checkOut: { type: Date },
  },
  { timestamps: true },
);

financeInvoiceSchema.index({ invoiceNumber: 1 }, { unique: true });
financeInvoiceSchema.index({ financePaymentId: 1 });
financeInvoiceSchema.index({ financePaymentObjectId: 1 });
financeInvoiceSchema.index({ bookingObjectId: 1 });
financeInvoiceSchema.index({ guestEmail: 1, createdAt: -1 });
financeInvoiceSchema.index({ status: 1 });
financeInvoiceSchema.index({ splitGroupId: 1 });

const FinanceInvoice: Model<IFinanceInvoice> =
  (mongoose.models?.FinanceInvoice as Model<IFinanceInvoice>) ??
  mongoose.model<IFinanceInvoice>("FinanceInvoice", financeInvoiceSchema);

export default FinanceInvoice;
