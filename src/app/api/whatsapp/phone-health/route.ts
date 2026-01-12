import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { WHATSAPP_PHONE_CONFIGS, getRetargetPhoneId, getWhatsAppToken, WHATSAPP_API_BASE_URL, getAllowedPhoneConfigs } from "@/lib/whatsapp/config";

connectDb();

// Simple in-memory cache (6-hour TTL)
const cache = new Map<string, { data: any; expiresAt: number; cachedAt: number }>();
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours
const STALE_THRESHOLD = 12 * 60 * 60 * 1000; // 12 hours

interface MetaPhoneHealth {
  quality_rating?: "GREEN" | "YELLOW" | "RED" | "UNKNOWN";
  status?: "CONNECTED" | "DISCONNECTED" | "UNKNOWN";
  throughput?: {
    level?: "STANDARD" | "TIER_50" | "TIER_250" | "TIER_1000" | "TIER_UNKNOWN";
  };
  code_verification_status?: "VERIFIED" | "UNVERIFIED";
  eligibility_for_api_business_global_search?: boolean;
}

interface PhoneHealthMetrics {
  phoneNumberId: string;
  displayName: string;
  displayNumber: string;
  qualityRating?: "GREEN" | "YELLOW" | "RED" | "UNKNOWN";
  status?: "CONNECTED" | "DISCONNECTED" | "UNKNOWN";
  throughputLevel?: string;
  healthStatus: "good" | "warning" | "danger";
  lastSyncTime: Date | null;
  codeVerificationStatus?: string;
  eligibleForGlobalSearch?: boolean;
  dataSourceStatus: "LIVE" | "CACHED" | "STALE";
  cacheAge?: number; // in hours
}

/**
 * Fetch phone number health from Meta WhatsApp Cloud API
 */
async function fetchMetaPhoneHealth(phoneNumberId: string): Promise<{
  data: MetaPhoneHealth | null;
  source: "LIVE" | "CACHED" | "STALE";
  cacheAge?: number;
}> {
  const cacheKey = `phone_health_${phoneNumberId}`;
  const cached = cache.get(cacheKey);
  const now = Date.now();
  
  // Return cached data if still valid
  if (cached && cached.expiresAt > now) {
    const cacheAge = (now - cached.cachedAt) / (1000 * 60 * 60); // hours
    return {
      data: cached.data,
      source: cacheAge > 12 ? "STALE" : "CACHED",
      cacheAge,
    };
  }

  // If cache exists but expired, check if stale
  if (cached && cached.cachedAt) {
    const cacheAge = (now - cached.cachedAt) / (1000 * 60 * 60);
    if (cacheAge > 12) {
      // Return stale data but mark it
      return {
        data: cached.data,
        source: "STALE",
        cacheAge,
      };
    }
  }

  try {
    const token = getWhatsAppToken();
    if (!token) {
      console.error("WhatsApp token not available");
      // Return cached if available, even if expired
      if (cached) {
        const cacheAge = (now - cached.cachedAt) / (1000 * 60 * 60);
        return {
          data: cached.data,
          source: "STALE",
          cacheAge,
        };
      }
      return { data: null, source: "STALE" };
    }

    // Fetch phone number health from Meta API
    const response = await fetch(
      `${WHATSAPP_API_BASE_URL}/${phoneNumberId}?fields=quality_rating,status,throughput,code_verification_status,eligibility_for_api_business_global_search`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`Meta API error for ${phoneNumberId}:`, errorData);
      // Return cached if available
      if (cached) {
        const cacheAge = (now - cached.cachedAt) / (1000 * 60 * 60);
        return {
          data: cached.data,
          source: "STALE",
          cacheAge,
        };
      }
      return { data: null, source: "STALE" };
    }

    const data = await response.json();
    
    // Cache the result
    cache.set(cacheKey, {
      data,
      expiresAt: now + CACHE_TTL,
      cachedAt: now,
    });

    return { data, source: "LIVE" };
  } catch (error) {
    console.error(`Error fetching Meta phone health for ${phoneNumberId}:`, error);
    // Return cached if available
    if (cached) {
      const cacheAge = (now - cached.cachedAt) / (1000 * 60 * 60);
      return {
        data: cached.data,
        source: "STALE",
        cacheAge,
      };
    }
    return { data: null, source: "STALE" };
  }
}

/**
 * Calculate health status based on Meta's official signals
 * UNKNOWN is treated as Warning (not neutral)
 */
function calculateHealthStatus(metaData: MetaPhoneHealth | null): "good" | "warning" | "danger" {
  if (!metaData) {
    return "warning"; // Unknown status = warning
  }

  // Danger zone: RED quality OR DISCONNECTED status
  if (
    metaData.quality_rating === "RED" ||
    metaData.status === "DISCONNECTED"
  ) {
    return "danger";
  }

  // Warning zone: YELLOW quality, UNKNOWN quality, OR low throughput
  // UNKNOWN is treated as warning (newly registered or under review)
  if (
    metaData.quality_rating === "YELLOW" ||
    metaData.quality_rating === "UNKNOWN" ||
    metaData.status === "UNKNOWN" ||
    (metaData.throughput?.level && 
     !["STANDARD", "TIER_1000", "TIER_250"].includes(metaData.throughput.level))
  ) {
    return "warning";
  }

  // Good: GREEN quality, CONNECTED, and good throughput
  if (
    metaData.quality_rating === "GREEN" &&
    metaData.status === "CONNECTED"
  ) {
    return "good";
  }

  // Default to warning for unknown states
  return "warning";
}

export async function GET(req: NextRequest) {
  try {
    const token = await getDataFromToken(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (token as any).role || "";
    const allowedRoles = ["SuperAdmin", "Sales-TeamLead", "Sales"];
    
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get location-scoped phone configs based on role
    const userAreas = (token as any).allotedArea || [];
    const allowedPhoneConfigs = getAllowedPhoneConfigs(userRole, userAreas);
    
    // Add retarget phone if SuperAdmin
    const retargetPhoneId = getRetargetPhoneId();
    if (retargetPhoneId && userRole === "SuperAdmin") {
      allowedPhoneConfigs.push({
        phoneNumberId: retargetPhoneId,
        displayNumber: "Retarget Phone",
        displayName: "Retarget Phone",
        area: "all",
        businessAccountId: "",
      });
    }

    // Check if manual refresh requested (SuperAdmin only)
    const searchParams = req.nextUrl.searchParams;
    const forceRefresh = searchParams.get("refresh") === "true" && userRole === "SuperAdmin";
    
    if (forceRefresh) {
      // Clear cache for all phone numbers
      allowedPhoneConfigs.forEach((config) => {
        if (config.phoneNumberId) {
          cache.delete(`phone_health_${config.phoneNumberId}`);
        }
      });
    }

    // Fetch Meta-verified health data for each phone number
    const healthMetricsResults = await Promise.all(
      allowedPhoneConfigs.map(async (config) => {
        const phoneNumberId = config.phoneNumberId;
        if (!phoneNumberId) return null;

        // Fetch from Meta API (with cache metadata)
        const { data: metaData, source, cacheAge } = await fetchMetaPhoneHealth(phoneNumberId);

        return {
          phoneNumberId,
          displayName: config.displayName,
          displayNumber: config.displayNumber,
          qualityRating: metaData?.quality_rating,
          status: metaData?.status,
          throughputLevel: metaData?.throughput?.level,
          codeVerificationStatus: metaData?.code_verification_status,
          eligibleForGlobalSearch: metaData?.eligibility_for_api_business_global_search,
          healthStatus: calculateHealthStatus(metaData),
          lastSyncTime: source === "LIVE" ? new Date() : null,
          dataSourceStatus: source,
          cacheAge,
        };
      })
    );

    // Filter out null entries
    const validMetrics = healthMetricsResults.filter((m) => m !== null) as PhoneHealthMetrics[];

    return NextResponse.json({
      success: true,
      metrics: validMetrics,
    });
  } catch (error: any) {
    console.error("Error fetching phone health:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
