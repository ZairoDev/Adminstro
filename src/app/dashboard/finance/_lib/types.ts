export type FinanceTransaction = {
  paymentId: string | null;
  paymentLinkId: string | null;
  orderId: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  amount: number;
  currency: string;
  status: string;
  method: string | null;
  bank: string | null;
  wallet: string | null;
  upi: string | null;
  card: Record<string, unknown> | null;
  fee: number | null;
  tax: number | null;
  netAmount: number | null;
  notes: Record<string, unknown> | null;
  description: string | null;
  shortUrl: string | null;
  createdAtRazorpay: string | null;
  authorizedAt: string | null;
  capturedAt: string | null;
  paidAt: string | null;
  failedAt: string | null;
  mapped: boolean;
  mappedAt: string | null;
  mappedBy: string | null;
  mappedByName: string | null;
  bookingId: string | null;
  guestId: string | null;
  guestName: string | null;
  guestEmail: string | null;
  invoiceId: string | null;
  invoiceNumber: string | null;
  propertyId: string | null;
  ownerId: string | null;
  mappingHistory: Array<{
    mappedBy: string;
    mappedByName?: string;
    mappedAt: string;
    previousBookingId?: string;
    newBookingId?: string;
    previousGuestId?: string;
    newGuestId?: string;
    reason?: string;
  }>;
  /** Finance invoice pipeline */
  invoiceStatus: "not_generated" | "generated" | "sent" | "failed";
  invoiceIds: string[];
  invoiceNumbers: string[];
  paymentClassification: "complete" | "partial" | "split" | null;
  pendingAmount: number | null;
  discountGiven: number | null;
  splitAllocations: Array<{
    guestId?: string;
    guestName?: string;
    guestEmail?: string;
    amount: number;
  }>;
  metadata: Record<string, unknown> | null;
  rawPayload: unknown;
  source: string;
  lastEvent: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GuestSuggestion = {
  confidence: "exact_phone" | "name_email" | "manual_search";
  guestId: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  bookingId: string;
  bookingObjectId: string;
  propertyName: string;
  address: string;
};

export type WebhookLogRow = {
  id: string;
  event: string | null;
  signatureVerified: boolean;
  receivedAt: string;
  processed: boolean;
  processedAt: string | null;
  status: string;
  error: string | null;
  retryCount: number;
  paymentId: string | null;
  paymentLinkId: string | null;
  payload: unknown;
  createdAt: string;
};

export function transactionPublicId(tx: {
  paymentId: string | null;
  paymentLinkId: string | null;
}): { id: string; type: "payment" | "link" } | null {
  if (tx.paymentId) return { id: tx.paymentId, type: "payment" };
  if (tx.paymentLinkId) return { id: tx.paymentLinkId, type: "link" };
  return null;
}

export function formatMoney(amount: number, currency = "INR"): string {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export type FinanceInvoiceRow = {
  id: string;
  invoiceNumber: string;
  financePaymentId: string | null;
  bookingId: string | null;
  guestId: string | null;
  guestName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  classification: "complete" | "partial" | "split";
  amountBilled: number;
  currency: string;
  discountGiven: number | null;
  pendingAmount: number | null;
  splitGroupId: string | null;
  splitTotalAmount: number | null;
  amountDueSnapshot: number | null;
  status: "generated" | "sent" | "failed" | "superseded";
  emailedAt: string | null;
  emailError: string | null;
  generatedBy: string | null;
  generatedByName: string | null;
  sentBy: string | null;
  sentByName: string | null;
  notes: string | null;
  createdAt: string;
};
