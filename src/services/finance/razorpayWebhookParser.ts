import type { FinancePaymentStatus } from "@/schemas/financePayment.schema";
import { normalizePhone } from "@/lib/finance/phone";

export const SUPPORTED_RAZORPAY_EVENTS = [
  "payment.authorized",
  "payment.captured",
  "payment.failed",
  "order.paid",
  "payment_link.paid",
  "payment_link.partially_paid",
  "payment_link.cancelled",
  "payment_link.expired",
  "refund.created",
  "refund.processed",
  "settlement.processed",
] as const;

export type SupportedRazorpayEvent = (typeof SUPPORTED_RAZORPAY_EVENTS)[number];

export function isSupportedEvent(event: string): event is SupportedRazorpayEvent {
  return (SUPPORTED_RAZORPAY_EVENTS as readonly string[]).includes(event);
}

function toDateFromUnix(unix?: number): Date | undefined {
  if (!unix || typeof unix !== "number") return undefined;
  return new Date(unix * 1000);
}

function fromSubunits(amount?: number): number {
  if (typeof amount !== "number" || Number.isNaN(amount)) return 0;
  return amount / 100;
}

type RazorpayEntity = Record<string, unknown>;

function asEntity(value: unknown): RazorpayEntity | undefined {
  if (value && typeof value === "object") {
    return value as RazorpayEntity;
  }
  return undefined;
}

export type ParsedWebhookPayment = {
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
  metadata?: Record<string, unknown>;
};

export function mapEventToStatus(event: string): FinancePaymentStatus | null {
  switch (event) {
    case "payment.authorized":
      return "authorized";
    case "payment.captured":
    case "order.paid":
      return "captured";
    case "payment.failed":
      return "failed";
    case "payment_link.paid":
      return "paid";
    case "payment_link.partially_paid":
      return "partially_paid";
    case "payment_link.cancelled":
      return "cancelled";
    case "payment_link.expired":
      return "expired";
    case "refund.created":
    case "refund.processed":
      return "refunded";
    case "settlement.processed":
      return null;
    default:
      return null;
  }
}

export function parseWebhookPayload(
  event: string,
  payload: unknown,
): ParsedWebhookPayment | null {
  const root = asEntity(payload);
  if (!root) return null;

  const paymentEntity = asEntity(asEntity(root.payment)?.entity);
  const paymentLinkEntity = asEntity(asEntity(root.payment_link)?.entity);
  const orderEntity = asEntity(asEntity(root.order)?.entity);
  const refundEntity = asEntity(asEntity(root.refund)?.entity);
  const settlementEntity = asEntity(asEntity(root.settlement)?.entity);

  const customerFromLink = asEntity(paymentLinkEntity?.customer);
  const notes =
    (asEntity(paymentEntity?.notes) as Record<string, unknown> | undefined) ??
    (asEntity(paymentLinkEntity?.notes) as Record<string, unknown> | undefined);

  let paymentLinkId =
    (paymentLinkEntity?.id as string | undefined) ??
    (paymentEntity?.payment_link_id as string | undefined);

  if (!paymentLinkId && typeof paymentEntity?.description === "string") {
    const match = paymentEntity.description.match(/plink_[A-Za-z0-9_-]+/);
    if (match) paymentLinkId = match[0];
  }

  const paymentId =
    (paymentEntity?.id as string | undefined) ??
    (refundEntity?.payment_id as string | undefined);

  const customerPhone =
    (paymentEntity?.contact as string | undefined) ??
    (customerFromLink?.contact as string | undefined);

  const amountRaw =
    (paymentEntity?.amount as number | undefined) ??
    (paymentLinkEntity?.amount_paid as number | undefined) ??
    (paymentLinkEntity?.amount as number | undefined) ??
    (refundEntity?.amount as number | undefined) ??
    0;

  const statusFromEvent = mapEventToStatus(event);
  const linkStatus = paymentLinkEntity?.status as string | undefined;
  let status: FinancePaymentStatus =
    statusFromEvent ??
    (linkStatus === "paid"
      ? "paid"
      : linkStatus === "partially_paid"
        ? "partially_paid"
        : linkStatus === "cancelled"
          ? "cancelled"
          : linkStatus === "expired"
            ? "expired"
            : "created");

  if (event === "settlement.processed") {
    status = "captured";
  }

  const createdAtRazorpay = toDateFromUnix(
    (paymentEntity?.created_at as number | undefined) ??
      (paymentLinkEntity?.created_at as number | undefined),
  );

  const capturedAt = toDateFromUnix(
    paymentEntity?.captured_at as number | undefined,
  );
  const now = new Date();

  const fee = fromSubunits(paymentEntity?.fee as number | undefined);
  const tax = fromSubunits(paymentEntity?.tax as number | undefined);
  const amount = fromSubunits(amountRaw);

  const parsed: ParsedWebhookPayment = {
    paymentId,
    paymentLinkId,
    orderId:
      (paymentEntity?.order_id as string | undefined) ??
      (orderEntity?.id as string | undefined),
    customerName:
      (customerFromLink?.name as string | undefined) ??
      (notes?.customer_name as string | undefined),
    customerEmail:
      (paymentEntity?.email as string | undefined) ??
      (customerFromLink?.email as string | undefined),
    customerPhone,
    customerPhoneNormalized: normalizePhone(customerPhone),
    amount,
    currency:
      (paymentEntity?.currency as string | undefined) ??
      (paymentLinkEntity?.currency as string | undefined) ??
      "INR",
    status,
    method: paymentEntity?.method as string | undefined,
    bank: paymentEntity?.bank as string | undefined,
    wallet: paymentEntity?.wallet as string | undefined,
    upi:
      typeof paymentEntity?.vpa === "string"
        ? paymentEntity.vpa
        : (asEntity(paymentEntity?.upi)?.vpa as string | undefined),
    card: asEntity(paymentEntity?.card),
    fee: fee || undefined,
    tax: tax || undefined,
    netAmount: amount - (fee || 0) - (tax || 0),
    notes,
    description:
      (paymentEntity?.description as string | undefined) ??
      (paymentLinkEntity?.description as string | undefined),
    shortUrl: paymentLinkEntity?.short_url as string | undefined,
    createdAtRazorpay,
    metadata: {
      settlementId: settlementEntity?.id,
      refundId: refundEntity?.id,
      event,
    },
  };

  if (status === "authorized") {
    parsed.authorizedAt = createdAtRazorpay ?? now;
  }
  if (status === "captured" || status === "paid") {
    parsed.capturedAt = capturedAt ?? now;
    parsed.paidAt = capturedAt ?? createdAtRazorpay ?? now;
  }
  if (status === "partially_paid") {
    parsed.paidAt = createdAtRazorpay ?? now;
  }
  if (status === "failed") {
    parsed.failedAt = createdAtRazorpay ?? now;
  }

  if (!parsed.paymentId && !parsed.paymentLinkId) {
    return null;
  }

  return parsed;
}
