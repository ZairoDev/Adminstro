import { z } from "zod";

export const financePaymentStatusSchema = z.enum([
  "created",
  "authorized",
  "captured",
  "paid",
  "partially_paid",
  "failed",
  "cancelled",
  "expired",
  "refunded",
]);

export const financePaymentSourceSchema = z.enum([
  "webhook",
  "sync",
  "manual",
]);

export const mappingHistoryEntrySchema = z.object({
  mappedBy: z.string().min(1),
  mappedByName: z.string().optional(),
  mappedAt: z.coerce.date(),
  previousBookingId: z.string().optional(),
  newBookingId: z.string().optional(),
  previousGuestId: z.string().optional(),
  newGuestId: z.string().optional(),
  reason: z.string().optional(),
});

export const financePaymentSchema = z.object({
  paymentId: z.string().optional(),
  paymentLinkId: z.string().optional(),
  orderId: z.string().optional(),
  customerName: z.string().optional(),
  customerEmail: z.string().optional(),
  customerPhone: z.string().optional(),
  customerPhoneNormalized: z.string().optional(),
  amount: z.number().min(0),
  currency: z.string().default("INR"),
  status: financePaymentStatusSchema.default("created"),
  method: z.string().optional(),
  bank: z.string().optional(),
  wallet: z.string().optional(),
  upi: z.string().optional(),
  card: z.record(z.unknown()).optional(),
  fee: z.number().optional(),
  tax: z.number().optional(),
  netAmount: z.number().optional(),
  notes: z.record(z.unknown()).optional(),
  description: z.string().optional(),
  shortUrl: z.string().optional(),
  createdAtRazorpay: z.coerce.date().optional(),
  authorizedAt: z.coerce.date().optional(),
  capturedAt: z.coerce.date().optional(),
  paidAt: z.coerce.date().optional(),
  failedAt: z.coerce.date().optional(),
  mapped: z.boolean().default(false),
  mappedAt: z.coerce.date().optional(),
  mappedBy: z.string().optional(),
  mappedByName: z.string().optional(),
  bookingId: z.string().optional(),
  bookingObjectId: z.string().optional(),
  guestId: z.string().optional(),
  guestName: z.string().optional(),
  guestEmail: z.string().optional(),
  invoiceId: z.string().optional(),
  invoiceNumber: z.string().optional(),
  propertyId: z.string().optional(),
  ownerId: z.string().optional(),
  mappingHistory: z.array(mappingHistoryEntrySchema).default([]),
  metadata: z.record(z.unknown()).optional(),
  rawPayload: z.unknown().optional(),
  source: financePaymentSourceSchema.default("webhook"),
  lastEvent: z.string().optional(),
});

export type FinancePaymentValidation = z.infer<typeof financePaymentSchema>;
export type FinancePaymentStatus = z.infer<typeof financePaymentStatusSchema>;
export type MappingHistoryEntry = z.infer<typeof mappingHistoryEntrySchema>;

export const listTransactionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  status: financePaymentStatusSchema.optional(),
  mapped: z
    .enum(["true", "false", "all"])
    .optional()
    .default("all"),
  method: z.string().optional(),
  phone: z.string().optional(),
  customer: z.string().optional(),
  paymentId: z.string().optional(),
  paymentLinkId: z.string().optional(),
  search: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  minAmount: z.coerce.number().optional(),
  maxAmount: z.coerce.number().optional(),
});

export const mapPaymentBodySchema = z.object({
  paymentId: z.string().optional(),
  paymentLinkId: z.string().optional(),
  bookingId: z.string().min(1, "bookingId is required"),
  guestId: z.string().min(1, "guestId is required"),
  reason: z.string().optional(),
  /** Required when remapping a payment that already has an invoice generated/sent */
  confirmRemap: z.boolean().optional(),
});

export const mapSuggestionsQuerySchema = z.object({
  paymentId: z.string().optional(),
  paymentLinkId: z.string().optional(),
  search: z.string().optional(),
});

/* ------------------------------------------------------------------ */
/*  Generate Invoice                                                    */
/* ------------------------------------------------------------------ */

const baseGenerateInvoiceSchema = z.object({
  paymentId: z.string().optional(),
  paymentLinkId: z.string().optional(),
  regenerate: z.boolean().default(false),
  notes: z.string().optional(),
  /** Override stay dates when booking does not have them */
  checkIn: z.coerce.date().optional(),
  checkOut: z.coerce.date().optional(),
});

const splitAllocationItemSchema = z.object({
  guestId: z.string().optional(),
  name: z.string().optional(),
  email: z.string().email("Invalid email in allocation").optional(),
  phone: z.string().optional(),
  amount: z.number().positive("Allocation amount must be positive"),
});

export const generateInvoiceBodySchema = z.discriminatedUnion("classification", [
  baseGenerateInvoiceSchema.extend({
    classification: z.literal("complete"),
    discountReason: z.string().optional(),
  }),
  baseGenerateInvoiceSchema.extend({
    classification: z.literal("partial"),
  }),
  baseGenerateInvoiceSchema.extend({
    classification: z.literal("split"),
    splitAllocations: z
      .array(splitAllocationItemSchema)
      .min(2, "Split requires at least 2 allocations"),
  }),
]);

export type GenerateInvoiceBody = z.infer<typeof generateInvoiceBodySchema>;
export type SplitAllocationItem = z.infer<typeof splitAllocationItemSchema>;

/* ------------------------------------------------------------------ */
/*  Send Invoice                                                        */
/* ------------------------------------------------------------------ */

export const sendInvoiceBodySchema = z.object({
  paymentId: z.string().optional(),
  paymentLinkId: z.string().optional(),
  /** If omitted, all generated/failed invoices for this payment are sent */
  invoiceNumbers: z.array(z.string()).optional(),
});

export type SendInvoiceBody = z.infer<typeof sendInvoiceBodySchema>;
