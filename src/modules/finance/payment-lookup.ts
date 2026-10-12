import type { FilterQuery } from "mongoose";
import type { IFinancePayment } from "@/modules/finance/models/payment.model";

type PaymentIdParams = {
  paymentId?: string;
  paymentLinkId?: string;
};

export function resolvePaymentFilter(
  params: PaymentIdParams,
  missing: "throw",
): FilterQuery<IFinancePayment>;
export function resolvePaymentFilter(
  params: PaymentIdParams,
  missing: "null",
): FilterQuery<IFinancePayment> | null;
export function resolvePaymentFilter(
  params: PaymentIdParams,
  missing: "throw" | "null",
): FilterQuery<IFinancePayment> | null {
  if (params.paymentId) return { paymentId: params.paymentId };
  if (params.paymentLinkId) return { paymentLinkId: params.paymentLinkId };
  if (missing === "throw") {
    throw new Error("paymentId or paymentLinkId is required");
  }
  return null;
}
