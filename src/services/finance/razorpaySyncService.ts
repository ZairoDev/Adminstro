import { getRazorpayClient } from "@/lib/razorpay";
import { upsertFinancePayment } from "@/services/finance/razorpayWebhookService";

type RazorpayRecord = Record<string, unknown>;

function asRecord(value: unknown): RazorpayRecord | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as RazorpayRecord;
  }
  return null;
}

function listItems(result: unknown): RazorpayRecord[] {
  const root = asRecord(result);
  const items = root?.items;
  if (!Array.isArray(items)) return [];
  return items.map(asRecord).filter((item): item is RazorpayRecord => item !== null);
}

function paymentEventForStatus(status: unknown): string {
  switch (status) {
    case "authorized":
      return "payment.authorized";
    case "failed":
      return "payment.failed";
    case "refunded":
      return "refund.processed";
    default:
      return "payment.captured";
  }
}

function paymentLinkEventForStatus(status: unknown): string {
  switch (status) {
    case "partially_paid":
      return "payment_link.partially_paid";
    case "cancelled":
      return "payment_link.cancelled";
    case "expired":
      return "payment_link.expired";
    default:
      return "payment_link.paid";
  }
}

export type RazorpaySyncResult = {
  paymentsFetched: number;
  paymentLinksFetched: number;
  upserted: number;
  ignored: number;
  keyMode: "test" | "live" | "unknown";
};

export async function syncRazorpayPaymentsToFinance(): Promise<RazorpaySyncResult> {
  const keyId = process.env.RAZORPAY_API_KEY?.trim() ?? "";
  const keyMode: RazorpaySyncResult["keyMode"] = keyId.startsWith("rzp_test_")
    ? "test"
    : keyId.startsWith("rzp_live_")
      ? "live"
      : "unknown";

  const razorpay = getRazorpayClient();

  const [paymentsResult, linksResult] = await Promise.all([
    razorpay.payments.all({ count: 100 }),
    razorpay.paymentLink.all({ count: 100 }),
  ]);

  const payments = listItems(paymentsResult);
  const links = listItems(linksResult);

  let upserted = 0;
  let ignored = 0;

  for (const payment of payments) {
    const result = await upsertFinancePayment(
      paymentEventForStatus(payment.status),
      { payload: { payment: { entity: payment } } },
      "sync",
    );
    if (result.upserted) upserted += 1;
    else ignored += 1;
  }

  for (const link of links) {
    let entity: RazorpayRecord = link;
    try {
      const detail = asRecord(await razorpay.paymentLink.fetch(String(link.id ?? "")));
      if (detail) entity = detail;
    } catch {
      // list payload is enough if fetch fails
    }

    const paymentsOnLink = asRecord(entity.payments);
    const linkPaymentItems = Array.isArray(paymentsOnLink?.items)
      ? paymentsOnLink.items.map(asRecord).filter((item): item is RazorpayRecord => item !== null)
      : [];

    const primaryPayment = linkPaymentItems[0];
    const result = await upsertFinancePayment(
      paymentLinkEventForStatus(entity.status),
      {
        payload: {
          payment_link: { entity },
          ...(primaryPayment ? { payment: { entity: primaryPayment } } : {}),
        },
      },
      "sync",
    );
    if (result.upserted) upserted += 1;
    else ignored += 1;
  }

  return {
    paymentsFetched: payments.length,
    paymentLinksFetched: links.length,
    upserted,
    ignored,
    keyMode,
  };
}
