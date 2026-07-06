import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import WhatsAppMessage from "@/models/whatsappMessage";
import { buildMessageDeliveryReport } from "@/lib/whatsapp/webhookInspector";
import { requireSuperAdmin } from "@/lib/admin/requireSuperAdmin";

export const dynamic = "force-dynamic";

const STUCK_STATUSES = ["sent", "sending"] as const;

/**
 * Find outgoing messages stuck at sent/sending where the same conversation
 * has later messages that reached delivered/read — classic symptom pattern.
 */
export async function GET(req: NextRequest) {
  const denied = await requireSuperAdmin(req);
  if (denied) return denied;

  await connectDb();

  const { searchParams } = new URL(req.url);
  const days = Math.min(parseInt(searchParams.get("days") ?? "7", 10) || 7, 30);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10) || 20, 50);
  const phone = searchParams.get("phone") ?? undefined;
  const includeReports = searchParams.get("reports") === "1";

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const match: Record<string, unknown> = {
    direction: "outgoing",
    status: { $in: STUCK_STATUSES },
    timestamp: { $gte: since },
  };
  if (phone) match.to = phone;

  const stuck = await WhatsAppMessage.find(match)
    .sort({ timestamp: -1 })
    .limit(limit * 3)
    .select("messageId conversationId to status timestamp businessPhoneId")
    .lean();

  const results: Array<{
    messageId: string;
    conversationId: string;
    customerPhone: string;
    status: string;
    timestamp: string;
    businessPhoneId: string;
    laterDeliveredCount: number;
    report?: Awaited<ReturnType<typeof buildMessageDeliveryReport>>;
  }> = [];

  for (const msg of stuck) {
    const laterDelivered = await WhatsAppMessage.countDocuments({
      conversationId: msg.conversationId,
      direction: "outgoing",
      timestamp: { $gt: msg.timestamp },
      status: { $in: ["delivered", "read"] },
    });

    if (laterDelivered === 0) continue;

    const entry = {
      messageId: msg.messageId,
      conversationId: String(msg.conversationId),
      customerPhone: msg.to,
      status: msg.status,
      timestamp: new Date(msg.timestamp).toISOString(),
      businessPhoneId: msg.businessPhoneId,
      laterDeliveredCount: laterDelivered,
      report: undefined as
        | Awaited<ReturnType<typeof buildMessageDeliveryReport>>
        | undefined,
    };

    if (includeReports) {
      entry.report =
        (await buildMessageDeliveryReport(msg.messageId)) ?? undefined;
    }

    results.push(entry);
    if (results.length >= limit) break;
  }

  return NextResponse.json({
    since: since.toISOString(),
    count: results.length,
    messages: results,
  });
}
