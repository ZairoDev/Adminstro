import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { buildPhoneTimeline } from "@/lib/whatsapp/webhookInspector";
import { requireSuperAdmin } from "@/lib/admin/requireSuperAdmin";

export const dynamic = "force-dynamic";

/** Chronological webhook timeline for a customer phone. */
export async function GET(req: NextRequest) {
  const denied = await requireSuperAdmin(req);
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const phone = searchParams.get("phone");
  if (!phone) {
    return NextResponse.json(
      { error: "phone query param required" },
      { status: 400 },
    );
  }

  const limit = Math.min(
    parseInt(searchParams.get("limit") ?? "200", 10) || 200,
    500,
  );

  await connectDb();
  const timeline = await buildPhoneTimeline(phone, limit);

  return NextResponse.json({ phone, timeline });
}
