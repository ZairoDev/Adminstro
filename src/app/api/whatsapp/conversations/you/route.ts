import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import { isWhatsAppAccessRole } from "@/lib/whatsapp/config";
import {
  applyPhoneMaskToConversation,
  resolveMaskRulesForToken,
} from "@/lib/whatsapp/phoneMask";
import { resolveYouConversationForInbox } from "@/lib/whatsapp/youConversationService";

export const dynamic = "force-dynamic";

connectDb();

/** Lazy-load the internal "You" conversation row for the inbox sidebar. */
export async function GET(req: NextRequest) {
  try {
    const token = (await getDataFromToken(req)) as {
      id?: string;
      _id?: string;
      role?: string;
    } | null;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = token.role || "";
    if (!isWhatsAppAccessRole(userRole)) {
      return NextResponse.json({ success: true, conversation: null });
    }

    const userId = String(token.id || token._id || "");
    if (!userId) {
      return NextResponse.json({ success: true, conversation: null });
    }

    const searchParams = req.nextUrl.searchParams;
    const unreadInboxFilter = searchParams.get("unreadFilter") === "true";
    const archivedOnly = searchParams.get("archivedOnly") === "true";

    const youConversation = await resolveYouConversationForInbox(userId, {
      unreadInboxFilter,
      archivedOnly,
    });

    if (!youConversation) {
      return NextResponse.json({ success: true, conversation: null });
    }

    const phoneMaskRules = await resolveMaskRulesForToken(token);
    const masked = applyPhoneMaskToConversation(
      youConversation,
      phoneMaskRules,
      userRole,
    );

    return NextResponse.json({
      success: true,
      conversation: masked,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    console.error("Get You conversation error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
