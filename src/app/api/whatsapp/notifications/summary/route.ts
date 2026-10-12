import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { FULL_ACCESS_ROLES } from "@/lib/whatsapp/config";
import { loadGlobalArchivedConversationIds } from "@/lib/whatsapp/conversationsListEnrichment";
import { buildConversationVisibilityFilterAsync } from "@/lib/whatsapp/locationAccess";
import {
  normalizeWhatsAppToken,
  resolveAllowedPhoneIdsAsync,
  type WhatsAppToken,
} from "@/lib/whatsapp/apiContext";
import {
  aggregateSummaryUnreadCount,
  buildSummaryCandidateFilter,
  countExpiringSummaryConversations,
  fetchTopExpiringSummaryConversations,
  fetchTopUnreadSummaryConversations,
} from "@/lib/whatsapp/notificationSummaryQuery";
import {
  getCachedNotificationSummary,
  setCachedNotificationSummary,
} from "@/lib/whatsapp/notificationSummaryCache";

connectDb();

export const dynamic = "force-dynamic";

const EMPTY_SUMMARY = {
  expiringCount: 0,
  unreadCount: 0,
  topItems: [] as const,
};

export async function GET(req: NextRequest) {
  try {
    const token = await getDataFromToken(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const whatsappToken = token as WhatsAppToken & { id?: string; _id?: string };
    const userRole = whatsappToken.role || "";
    const allowedRoles = ["SuperAdmin", "Sales-TeamLead", "Sales"];

    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userId = whatsappToken.id || whatsappToken._id;
    if (!userId) {
      return NextResponse.json({ error: "User ID not found" }, { status: 400 });
    }

    const cached = getCachedNotificationSummary(String(userId));
    if (cached) {
      return NextResponse.json({ success: true, summary: cached });
    }

    const normalizedToken = normalizeWhatsAppToken(whatsappToken);
    const allowedPhoneIds = await resolveAllowedPhoneIdsAsync(normalizedToken);

    if (
      allowedPhoneIds.length === 0 &&
      !(FULL_ACCESS_ROLES as readonly string[]).includes(userRole)
    ) {
      return NextResponse.json({
        success: true,
        summary: EMPTY_SUMMARY,
      });
    }

    const now = new Date();
    const [archivedSnapshot, visibilityFilter] = await Promise.all([
      loadGlobalArchivedConversationIds(),
      buildConversationVisibilityFilterAsync(whatsappToken),
    ]);

    const candidateFilter = buildSummaryCandidateFilter(
      visibilityFilter,
      archivedSnapshot,
    );

    const [
      expiringCount,
      unreadCount,
      expiringTop,
      unreadTop,
    ] = await Promise.all([
      countExpiringSummaryConversations(candidateFilter, now),
      aggregateSummaryUnreadCount(candidateFilter, userId),
      fetchTopExpiringSummaryConversations(candidateFilter, now, 5),
      fetchTopUnreadSummaryConversations(candidateFilter, userId, 5),
    ]);

    const topItems = [
      ...expiringTop.map((item) => ({ ...item, type: "expiring" as const })),
      ...unreadTop.map((item) => ({ ...item, type: "unread" as const })),
    ].slice(0, 7);

    const summary = {
      expiringCount,
      unreadCount,
      topItems,
    };

    setCachedNotificationSummary(String(userId), summary);

    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    console.error("Error fetching notification summary:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
