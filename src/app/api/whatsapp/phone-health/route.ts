import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { getWhatsAppToken, WHATSAPP_API_BASE_URL } from "@/lib/whatsapp/config";
import { getOutboundTokenForPhoneId } from "@/lib/whatsapp/channelService";
import {
  normalizeUserAreas,
  resolveAllottedChannelPhones,
} from "@/lib/whatsapp/resolveAllowedPhoneConfigs";
import WhatsAppConversation from "@/models/whatsappConversation";

connectDb();

export const dynamic = "force-dynamic";

const cache = new Map<
  string,
  { data: MetaPhoneHealth; expiresAt: number; cachedAt: number }
>();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const STALE_AFTER_HOURS = 12;

interface MetaPhoneHealth {
  quality_rating?: "GREEN" | "YELLOW" | "RED" | "UNKNOWN";
  status?: "CONNECTED" | "DISCONNECTED" | "UNKNOWN";
  throughput?: {
    level?: "STANDARD" | "TIER_50" | "TIER_250" | "TIER_1000" | "TIER_UNKNOWN";
  };
  code_verification_status?: "VERIFIED" | "UNVERIFIED";
  eligibility_for_api_business_global_search?: boolean;
  verified_name?: string;
  display_phone_number?: string;
}

export interface PhoneHealthMetrics {
  phoneNumberId: string;
  channelId?: string;
  displayName: string;
  displayNumber: string;
  locations: Array<{ displayName: string; locationKey: string }>;
  qualityRating?: "GREEN" | "YELLOW" | "RED" | "UNKNOWN";
  status?: "CONNECTED" | "DISCONNECTED" | "UNKNOWN";
  throughputLevel?: string;
  healthStatus: "good" | "warning" | "danger" | "unknown";
  connectionLabel: "Connected" | "Warning" | "Disconnected" | "Unknown";
  healthPercent: number | null;
  chatsToday: number;
  codeVerificationStatus?: string;
  eligibleForGlobalSearch?: boolean;
  dataSourceStatus: "LIVE" | "CACHED" | "STALE" | "NOT_SYNCED";
  cacheAgeHours?: number;
  lastSyncedAt: string | null;
}

export interface PhoneHealthSummary {
  connectedCount: number;
  totalChatsToday: number;
  activeAgents: number;
  avgHealthPercent: number | null;
}

function connectionLabelFromHealth(
  healthStatus: PhoneHealthMetrics["healthStatus"],
  status?: string,
): PhoneHealthMetrics["connectionLabel"] {
  if (status === "DISCONNECTED" || healthStatus === "danger") return "Disconnected";
  if (healthStatus === "warning") return "Warning";
  if (status === "CONNECTED" && healthStatus === "good") return "Connected";
  if (healthStatus === "unknown") return "Unknown";
  return status === "CONNECTED" ? "Connected" : "Warning";
}

function healthPercentFromStatus(
  healthStatus: PhoneHealthMetrics["healthStatus"],
): number | null {
  switch (healthStatus) {
    case "good":
      return 99.8;
    case "warning":
      return 87;
    case "danger":
      return 65;
    default:
      return null;
  }
}

function startOfTodayUtc(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

async function fetchActivityStats(phoneIds: string[]): Promise<{
  chatsByPhone: Map<string, number>;
  activeAgents: number;
}> {
  if (phoneIds.length === 0) {
    return { chatsByPhone: new Map(), activeAgents: 0 };
  }

  const startOfToday = startOfTodayUtc();
  const [byPhone, agentRows] = await Promise.all([
    WhatsAppConversation.aggregate<{ _id: string; chatsToday: number }>([
      {
        $match: {
          businessPhoneId: { $in: phoneIds },
          status: "active",
          source: { $ne: "internal" },
          lastMessageTime: { $gte: startOfToday },
        },
      },
      { $group: { _id: "$businessPhoneId", chatsToday: { $sum: 1 } } },
    ]),
    WhatsAppConversation.distinct("assignedAgent", {
      businessPhoneId: { $in: phoneIds },
      status: "active",
      source: { $ne: "internal" },
      lastMessageTime: { $gte: startOfToday },
      assignedAgent: { $exists: true, $ne: null },
    }),
  ]);

  const chatsByPhone = new Map(byPhone.map((row) => [row._id, row.chatsToday]));
  return { chatsByPhone, activeAgents: agentRows.length };
}

async function fetchMetaPhoneHealth(
  phoneNumberId: string,
  forceLive: boolean,
  preferredToken?: string,
): Promise<{
  data: MetaPhoneHealth | null;
  source: PhoneHealthMetrics["dataSourceStatus"];
  cacheAgeHours?: number;
}> {
  const cacheKey = `phone_health_${phoneNumberId}`;
  const cached = cache.get(cacheKey);
  const now = Date.now();

  if (!forceLive && cached) {
    const cacheAgeHours = (now - cached.cachedAt) / (1000 * 60 * 60);
    if (cached.expiresAt > now) {
      return {
        data: cached.data,
        source: cacheAgeHours > STALE_AFTER_HOURS ? "STALE" : "CACHED",
        cacheAgeHours,
      };
    }
    if (cacheAgeHours <= STALE_AFTER_HOURS) {
      return { data: cached.data, source: "STALE", cacheAgeHours };
    }
  }

  const tokenCandidates: string[] = [];
  const addToken = (value?: string | null) => {
    const trimmed = value?.trim();
    if (!trimmed || tokenCandidates.includes(trimmed)) return;
    tokenCandidates.push(trimmed);
  };
  addToken(preferredToken);
  addToken(await getOutboundTokenForPhoneId(phoneNumberId));
  addToken(getWhatsAppToken());

  if (tokenCandidates.length === 0) {
    if (cached) {
      const cacheAgeHours = (now - cached.cachedAt) / (1000 * 60 * 60);
      return { data: cached.data, source: "STALE", cacheAgeHours };
    }
    return { data: null, source: "NOT_SYNCED" };
  }

  const fields =
    "verified_name,display_phone_number,code_verification_status,quality_rating,status,throughput";

  for (const token of tokenCandidates) {
    try {
      const response = await fetch(`${WHATSAPP_API_BASE_URL}/${phoneNumberId}?fields=${fields}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      if (!response.ok) continue;

      const data = (await response.json()) as MetaPhoneHealth & { error?: unknown };
      if (data?.error) continue;

      cache.set(cacheKey, {
        data,
        expiresAt: now + CACHE_TTL_MS,
        cachedAt: now,
      });

      const source: PhoneHealthMetrics["dataSourceStatus"] = forceLive ? "LIVE" : "CACHED";
      return { data, source };
    } catch {
      continue;
    }
  }

  if (cached) {
    const cacheAgeHours = (now - cached.cachedAt) / (1000 * 60 * 60);
    return { data: cached.data, source: "STALE", cacheAgeHours };
  }
  return { data: null, source: "NOT_SYNCED" };
}

function calculateHealthStatus(
  metaData: MetaPhoneHealth | null,
): PhoneHealthMetrics["healthStatus"] {
  if (!metaData) return "unknown";

  if (metaData.quality_rating === "RED" || metaData.status === "DISCONNECTED") {
    return "danger";
  }

  if (
    metaData.quality_rating === "YELLOW" ||
    metaData.quality_rating === "UNKNOWN" ||
    metaData.status === "UNKNOWN" ||
    (metaData.throughput?.level &&
      !["STANDARD", "TIER_1000", "TIER_250"].includes(metaData.throughput.level))
  ) {
    return "warning";
  }

  if (metaData.quality_rating === "GREEN" && metaData.status === "CONNECTED") {
    return "good";
  }

  return "warning";
}

const HEALTH_ROLES = ["SuperAdmin", "Sales-TeamLead", "Sales"] as const;

export async function GET(req: NextRequest) {
  try {
    await connectDb();
    const token = await getDataFromToken(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = String((token as { role?: string }).role || "");
    if (!HEALTH_ROLES.includes(userRole as (typeof HEALTH_ROLES)[number])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userAreas = normalizeUserAreas(
      (token as { allotedArea?: unknown }).allotedArea,
    );
    const userRentalType = (token as { rentalType?: unknown }).rentalType;

    const phoneConfigs = await resolveAllottedChannelPhones(
      userRole,
      userAreas,
      userRentalType,
    );

    const searchParams = req.nextUrl.searchParams;
    const forceRefresh =
      searchParams.get("refresh") === "true" && userRole === "SuperAdmin";

    if (forceRefresh) {
      phoneConfigs.forEach((config) => {
        if (config.phoneNumberId) {
          cache.delete(`phone_health_${config.phoneNumberId}`);
        }
      });
    }

    const phoneIds = phoneConfigs.map((c) => c.phoneNumberId).filter(Boolean);
    const { chatsByPhone, activeAgents } = await fetchActivityStats(phoneIds);

    const metrics: PhoneHealthMetrics[] = await Promise.all(
      phoneConfigs.map(async (config) => {
        const { data: metaData, source, cacheAgeHours } = await fetchMetaPhoneHealth(
          config.phoneNumberId,
          forceRefresh,
          config.accessToken,
        );

        const displayName =
          metaData?.verified_name || config.displayName || "WhatsApp line";
        const displayNumber =
          metaData?.display_phone_number || config.displayNumber || config.phoneNumberId;
        const healthStatus = calculateHealthStatus(metaData);
        const connectionLabel = connectionLabelFromHealth(healthStatus, metaData?.status);
        const healthPercent = healthPercentFromStatus(healthStatus);

        return {
          phoneNumberId: config.phoneNumberId,
          channelId: config.channelId,
          displayName,
          displayNumber,
          locations: config.locations ?? [],
          qualityRating: metaData?.quality_rating,
          status: metaData?.status,
          throughputLevel: metaData?.throughput?.level,
          codeVerificationStatus: metaData?.code_verification_status,
          eligibleForGlobalSearch: metaData?.eligibility_for_api_business_global_search,
          healthStatus,
          connectionLabel,
          healthPercent,
          chatsToday: chatsByPhone.get(config.phoneNumberId) ?? 0,
          dataSourceStatus: source,
          cacheAgeHours,
          lastSyncedAt: source === "LIVE" ? new Date().toISOString() : null,
        };
      }),
    );

    const connectedCount = metrics.filter((m) => m.connectionLabel === "Connected").length;
    const totalChatsToday = metrics.reduce((sum, m) => sum + m.chatsToday, 0);
    const healthValues = metrics
      .map((m) => m.healthPercent)
      .filter((v): v is number => v !== null);
    const avgHealthPercent =
      healthValues.length > 0
        ? Math.round((healthValues.reduce((a, b) => a + b, 0) / healthValues.length) * 10) / 10
        : null;

    const summary: PhoneHealthSummary = {
      connectedCount,
      totalChatsToday,
      activeAgents,
      avgHealthPercent,
    };

    return NextResponse.json({
      success: true,
      metrics,
      summary,
      cachedOnly: !forceRefresh,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("Error fetching phone health:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
