import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import {
  WHATSAPP_PHONE_CONFIGS,
  getAllowedPhoneConfigs,
  getRetargetPhoneId,
} from "@/lib/whatsapp/config";
import { normalizeCityKey } from "@/lib/city-normalizer";
import { fetchPhoneNumbersFromMeta, mapMetaPhonesToConfigs } from "@/lib/whatsapp/phoneMetadataSync";
import { getAllPhoneLocationConfigs } from "@/lib/whatsapp/phoneAreaConfigService";

// Force dynamic rendering since we use request.cookies for authentication
export const dynamic = 'force-dynamic';

/** Filter Meta-fetched configs using the same rules as getAllowedPhoneConfigs. */
function filterPhoneConfigsByRole(
  configs: { phoneNumberId?: string }[],
  userRole: string,
  userAreas: string[] = [],
): { phoneNumberId?: string }[] {
  const allowedIds = new Set(
    getAllowedPhoneConfigs(userRole, userAreas.map((a) => normalizeCityKey(a)))
      .map((c) => c.phoneNumberId)
      .filter(Boolean),
  );
  return configs.filter(
    (c) => c.phoneNumberId && allowedIds.has(c.phoneNumberId),
  );
}

/**
 * GET /api/whatsapp/phone-configs
 * 
 * Fetch phone configs independently of conversations.
 * 
 * Data Ownership:
 * - Meta API: Source of truth for phone number existence and metadata
 * - config.ts: Source of truth for enabled numbers, locations, and role permissions
 * 
 * Returns phone configs that exist in BOTH Meta and config.ts, filtered by user role/area.
 */
export async function GET(req: NextRequest) {
  try {
    const token = await getDataFromToken(req) as any;
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userRole = token.role || "";
    
    // Normalize userAreas - handle string, array, or comma-separated string
    // This ensures consistent behavior between local and production environments
    let userAreas: string[] = [];
    if (token.allotedArea) {
      if (Array.isArray(token.allotedArea)) {
        userAreas = token.allotedArea.map((a: any) => String(a).trim()).filter(Boolean);
      } else if (typeof token.allotedArea === 'string') {
        // Handle comma-separated string (e.g., "athens,thessaloniki") or single string
        userAreas = token.allotedArea.split(',').map((a: any) => a.trim()).filter(Boolean);
      }
    }

    // Debug logging to help diagnose differences between local and production


    // CRITICAL: Fetch phone numbers directly from Meta API for business account
    // Meta is the ONLY source of truth for phone number existence
    const businessAccountId = "770501279114785"; // WhatsApp Business Account ID
    const metaPhones = await fetchPhoneNumbersFromMeta(businessAccountId);
    
    // Area mapping: DB is source of truth; config.ts is fallback via service
    const dbPhoneLocations = await getAllPhoneLocationConfigs();
    const areaMapping = new Map<string, string | string[]>();
    for (const row of dbPhoneLocations) {
      if (row.locations.length > 0) {
        areaMapping.set(
          row.phoneNumberId,
          row.locations.map((loc) => loc.locationKey)
        );
      }
    }
    WHATSAPP_PHONE_CONFIGS.forEach((config) => {
      if (config.phoneNumberId && !areaMapping.has(config.phoneNumberId)) {
        areaMapping.set(config.phoneNumberId, config.area);
      }
    });
    
    // Map Meta phones to configs with area information
    const allMetaConfigs = mapMetaPhonesToConfigs(metaPhones, areaMapping);
    
    // CRITICAL: Only return phone numbers that exist in BOTH Meta and config.ts
    // Meta is source of truth for phone existence, config.ts is source of truth for enabled/area/roles
    const configPhoneIds = new Set(WHATSAPP_PHONE_CONFIGS.map(c => c.phoneNumberId).filter(Boolean));
    const metaAndConfigConfigs = allMetaConfigs.filter(config => 
      config.phoneNumberId && configPhoneIds.has(config.phoneNumberId)
    );
    
    // Filter by user role and areas
    let allowedPhoneConfigs = filterPhoneConfigsByRole(metaAndConfigConfigs, userRole, userAreas);

    // Advert role: grant access to retarget phone only (for retarget WhatsApp inbox)
    if (allowedPhoneConfigs.length === 0 && userRole === "Advert") {
      const retargetPhoneId = getRetargetPhoneId();
      if (retargetPhoneId) {
        const retargetConfig = metaAndConfigConfigs.find(
          (c: any) => c.phoneNumberId === retargetPhoneId
        );
        if (retargetConfig) {
          allowedPhoneConfigs = [retargetConfig];
        }
      }
    }

    // Attach full location entries for clients (display + key)
    const locationsByPhone = new Map(
      dbPhoneLocations.map((row) => [row.phoneNumberId, row.locations])
    );
    allowedPhoneConfigs = allowedPhoneConfigs.map((config: { phoneNumberId?: string }) => ({
      ...config,
      locations: config.phoneNumberId
        ? locationsByPhone.get(config.phoneNumberId) ?? []
        : [],
    }));

    return NextResponse.json({
      success: true,
      phoneConfigs: allowedPhoneConfigs,
    });
  } catch (error: any) {
    console.error("Get phone configs error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
