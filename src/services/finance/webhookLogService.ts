import type { FilterQuery } from "mongoose";
import RazorpayWebhookLog, {
  type IRazorpayWebhookLog,
} from "@/models/razorpayWebhookLog";

export type WebhookLogListParams = {
  page: number;
  limit: number;
  event?: string;
  status?: string;
  processed?: "true" | "false" | "all";
  dateFrom?: string;
  dateTo?: string;
  search?: string;
};

export function toPublicWebhookLog(doc: IRazorpayWebhookLog) {
  return {
    id: String(doc._id),
    event: doc.event ?? null,
    signatureVerified: doc.signatureVerified,
    receivedAt: doc.receivedAt,
    processed: doc.processed,
    processedAt: doc.processedAt ?? null,
    status: doc.status,
    error: doc.error ?? null,
    retryCount: doc.retryCount,
    paymentId: doc.paymentId ?? null,
    paymentLinkId: doc.paymentLinkId ?? null,
    payload: doc.payload ?? null,
    createdAt: doc.createdAt,
  };
}

export async function listWebhookLogs(params: WebhookLogListParams) {
  const filter: FilterQuery<IRazorpayWebhookLog> = {};

  if (params.event) filter.event = params.event;
  if (params.status) filter.status = params.status;
  if (params.processed === "true") filter.processed = true;
  if (params.processed === "false") filter.processed = false;

  if (params.dateFrom || params.dateTo) {
    filter.receivedAt = {};
    if (params.dateFrom) filter.receivedAt.$gte = new Date(params.dateFrom);
    if (params.dateTo) {
      const end = new Date(params.dateTo);
      end.setHours(23, 59, 59, 999);
      filter.receivedAt.$lte = end;
    }
  }

  if (params.search) {
    const q = params.search.trim();
    filter.$or = [
      { event: { $regex: q, $options: "i" } },
      { paymentId: { $regex: q, $options: "i" } },
      { paymentLinkId: { $regex: q, $options: "i" } },
      { error: { $regex: q, $options: "i" } },
    ];
  }

  const skip = (params.page - 1) * params.limit;
  const [items, total] = await Promise.all([
    RazorpayWebhookLog.find(filter)
      .sort({ receivedAt: -1 })
      .skip(skip)
      .limit(params.limit)
      .lean<IRazorpayWebhookLog[]>(),
    RazorpayWebhookLog.countDocuments(filter),
  ]);

  return {
    data: items.map((item) =>
      toPublicWebhookLog(item as IRazorpayWebhookLog),
    ),
    page: params.page,
    limit: params.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / params.limit)),
  };
}

export async function listWebhookLogsForPayment(params: {
  paymentId?: string | null;
  paymentLinkId?: string | null;
}) {
  const or: Record<string, string>[] = [];
  if (params.paymentId) or.push({ paymentId: params.paymentId });
  if (params.paymentLinkId) or.push({ paymentLinkId: params.paymentLinkId });
  if (or.length === 0) return [];

  const logs = await RazorpayWebhookLog.find({ $or: or })
    .sort({ receivedAt: -1 })
    .limit(50)
    .lean<IRazorpayWebhookLog[]>();

  return logs.map((item) => toPublicWebhookLog(item as IRazorpayWebhookLog));
}
