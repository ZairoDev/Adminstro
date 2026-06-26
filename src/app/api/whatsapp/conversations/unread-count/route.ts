import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import {
  buildInboxListQueryAsync,
  parseInboxListParams,
} from "@/lib/whatsapp/inboxQuery";
import {
  normalizeWhatsAppToken,
  type WhatsAppToken,
} from "@/lib/whatsapp/apiContext";
import { canAccessWhatsAppAdminQueue } from "@/lib/whatsapp/participantLocationPrivileges";
import { resolveInboxUnreadBadgeCount } from "@/lib/whatsapp/inboxUnreadBadgeQuery";

export const dynamic = "force-dynamic";

connectDb();

/** Lightweight inbox-wide unread badge count (separate from paginated list). */
export async function GET(req: NextRequest) {
  try {
    const token = (await getDataFromToken(req)) as {
      id?: string;
      _id?: string;
      role?: string;
      email?: string;
      allotedArea?: unknown;
    } | null;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const normalizedToken = normalizeWhatsAppToken(token as WhatsAppToken);
    const userId = token.id || token._id;
    if (!userId) {
      return NextResponse.json({ success: true, unreadCount: 0 });
    }

    const searchParams = req.nextUrl.searchParams;
    const retargetOnly =
      searchParams.get("retargetOnly") === "1" ||
      searchParams.get("retargetOnly") === "true";

    const inboxParams = parseInboxListParams(searchParams);
    inboxParams.retargetOnly = retargetOnly;

    if (
      inboxParams.adminQueue &&
      !canAccessWhatsAppAdminQueue({
        role: normalizedToken.role || "",
        email: token.email,
        allotedArea: normalizedToken.allotedArea,
      })
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const visibilityQuery = await buildInboxListQueryAsync(
      normalizedToken,
      inboxParams,
    );
    if (visibilityQuery._id === null) {
      return NextResponse.json({ success: true, unreadCount: 0 });
    }

    const unreadCount = await resolveInboxUnreadBadgeCount(
      normalizedToken,
      inboxParams,
      userId,
    );

    return NextResponse.json({ success: true, unreadCount });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    console.error("Get unread count error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
