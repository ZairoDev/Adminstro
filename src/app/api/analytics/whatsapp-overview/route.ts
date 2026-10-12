import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { normalizeUserAreas } from "@/lib/whatsapp/resolveAllowedPhoneConfigs";
import { FULL_ACCESS_ROLES } from "@/lib/whatsapp/config";
import { buildWhatsAppOverview } from "@/lib/whatsapp/analytics/whatsappAnalyticsService";
import type { WhatsAppOverviewResponse } from "@/lib/whatsapp/analytics/types";

connectDb();

export const dynamic = "force-dynamic";

export type { WhatsAppOverviewResponse } from "@/lib/whatsapp/analytics/types";

const responseCache = new Map<
  string,
  { data: WhatsAppOverviewResponse; expiresAt: number }
>();
const CACHE_TTL_MS = 5 * 60 * 1000;

const WHATSAPP_ANALYTICS_ROLES = [
  "SuperAdmin",
  "Admin",
  "Sales-TeamLead",
  "Sales",
  "Developer",
] as const;

export async function GET(req: NextRequest) {
  try {
    await connectDb();
    const token = await getDataFromToken(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userRole = String((token as { role?: string }).role ?? "");
    if (!WHATSAPP_ANALYTICS_ROLES.includes(userRole as (typeof WHATSAPP_ANALYTICS_ROLES)[number])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userAreas = normalizeUserAreas((token as { allotedArea?: unknown }).allotedArea);
    const isFullAccess = (FULL_ACCESS_ROLES as readonly string[]).includes(userRole);

    const { searchParams } = req.nextUrl;
    const period = searchParams.get("period") ?? "this_month";
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const locationPage = Math.max(1, parseInt(searchParams.get("locationPage") ?? "1"));
    const templatePage = Math.max(1, parseInt(searchParams.get("templatePage") ?? "1"));
    const forceRefresh = searchParams.get("refresh") === "true";

    if (period === "custom" && !dateFrom) {
      return NextResponse.json(
        { error: "dateFrom is required when period is custom" },
        { status: 400 },
      );
    }

    const areaKey = isFullAccess ? "all" : userAreas.sort().join(",");
    const dateKey =
      period === "custom" ? `${dateFrom ?? ""}:${dateTo ?? ""}` : period;
    const cacheKey = `wa_v4:${userRole}:${areaKey}:${dateKey}:lp${locationPage}:tp${templatePage}`;

    if (!forceRefresh) {
      const cached = responseCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return NextResponse.json(cached.data);
      }
    }

    const result = await buildWhatsAppOverview({
      period,
      dateFrom,
      dateTo,
      userAreas,
      isFullAccess,
      locationPage,
      templatePage,
    });

    responseCache.set(cacheKey, {
      data: result,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[whatsapp-overview]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
