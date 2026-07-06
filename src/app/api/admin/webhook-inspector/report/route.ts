import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { buildMessageDeliveryReport } from "@/lib/whatsapp/webhookInspector";
import { requireSuperAdmin } from "@/lib/admin/requireSuperAdmin";

export const dynamic = "force-dynamic";

/** Per-message delivery chain report (Meta webhooks vs Mongo vs socket). */
export async function GET(req: NextRequest) {
  const denied = await requireSuperAdmin(req);
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const messageId = searchParams.get("messageId");
  if (!messageId) {
    return NextResponse.json(
      { error: "messageId query param required" },
      { status: 400 },
    );
  }

  await connectDb();
  const report = await buildMessageDeliveryReport(messageId);

  if (!report) {
    return NextResponse.json(
      { error: "Message not found in Mongo" },
      { status: 404 },
    );
  }

  return NextResponse.json({ report });
}
