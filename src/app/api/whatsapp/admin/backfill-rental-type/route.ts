import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import WhatsAppConversation from "@/models/whatsappConversation";
import { DEFAULT_CONVERSATION_RENTAL_TYPE } from "@/lib/whatsapp/rentalTypeAccess";

export const dynamic = "force-dynamic";

const ADMIN_ROLES = ["SuperAdmin", "Admin", "HAdmin", "Developer"];

/**
 * Backfill rentalType for legacy conversations that pre-date the multi-channel
 * upgrade. Existing chats default to "Long Term" so they remain visible to
 * Long Term staff and full-access roles. Idempotent — only touches rows with a
 * missing/empty rentalType.
 */
export async function POST(req: NextRequest) {
  try {
    const token = (await getDataFromToken(req)) as { role?: unknown } | null;
    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (!ADMIN_ROLES.includes(String(token.role ?? ""))) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    await connectDb();

    const result = await WhatsAppConversation.updateMany(
      {
        source: { $ne: "internal" },
        $or: [
          { rentalType: { $exists: false } },
          { rentalType: null },
          { rentalType: "" },
        ],
      },
      { $set: { rentalType: DEFAULT_CONVERSATION_RENTAL_TYPE } },
    );

    return NextResponse.json({
      success: true,
      matched: result.matchedCount ?? 0,
      modified: result.modifiedCount ?? 0,
      rentalType: DEFAULT_CONVERSATION_RENTAL_TYPE,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error)?.message || "Backfill failed" },
      { status: 500 },
    );
  }
}
