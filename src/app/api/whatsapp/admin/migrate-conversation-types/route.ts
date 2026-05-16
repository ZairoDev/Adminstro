import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import WhatsAppConversation from "@/models/whatsappConversation";

export const dynamic = "force-dynamic";

connectDb();

const DEFAULT_START_ISO = "2026-04-01T00:00:00.000Z";

/**
 * POST /api/whatsapp/admin/migrate-conversation-types
 * SuperAdmin only: bulk-set conversationType for conversations in a date range.
 */
export async function POST(req: NextRequest) {
  try {
    const token = (await getDataFromToken(req)) as { role?: string } | null;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (token.role !== "SuperAdmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: { startDate?: string; endDate?: string; conversationType?: string } = {};
    try {
      body = await req.json();
    } catch {
      /* empty body OK — use defaults */
    }

    const conversationType =
      body.conversationType === "guest" ? "guest" : "owner";

    const startDate = body.startDate
      ? new Date(body.startDate)
      : new Date(DEFAULT_START_ISO);
    const endDate = body.endDate ? new Date(body.endDate) : new Date();

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
    }

    const result = await WhatsAppConversation.updateMany(
      {
        createdAt: { $gte: startDate, $lte: endDate },
      },
      { $set: { conversationType } },
    );

    return NextResponse.json({
      success: true,
      conversationType,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[migrate-conversation-types]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
