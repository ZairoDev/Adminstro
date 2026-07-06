import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import WebhookInspectorEvent from "@/models/webhookInspectorEvent";
import { requireSuperAdmin } from "@/lib/admin/requireSuperAdmin";

export const dynamic = "force-dynamic";

/** List persisted inspector events (filtered by query params). */
export async function GET(req: NextRequest) {
  const denied = await requireSuperAdmin(req);
  if (denied) return denied;

  await connectDb();

  const { searchParams } = new URL(req.url);
  const customerPhone = searchParams.get("phone") ?? undefined;
  const messageId = searchParams.get("messageId") ?? undefined;
  const businessPhoneId = searchParams.get("businessPhoneId") ?? undefined;
  const conversationId = searchParams.get("conversationId") ?? undefined;
  const limit = Math.min(
    parseInt(searchParams.get("limit") ?? "100", 10) || 100,
    500,
  );

  const query: Record<string, string> = {};
  if (customerPhone) query.customerPhone = customerPhone;
  if (messageId) query.messageId = messageId;
  if (businessPhoneId) query.businessPhoneId = businessPhoneId;
  if (conversationId) query.conversationId = conversationId;

  const events = await WebhookInspectorEvent.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();

  return NextResponse.json({ count: events.length, events });
}
