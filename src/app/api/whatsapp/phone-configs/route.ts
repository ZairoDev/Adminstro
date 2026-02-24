import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { 
  WHATSAPP_PHONE_CONFIGS,
  FULL_ACCESS_ROLES,
  WHATSAPP_ACCESS_ROLES,
  getRetargetPhoneId,
} from "@/lib/whatsapp/config";
import { fetchPhoneNumbersFromMeta, mapMetaPhonesToConfigs } from "@/lib/whatsapp/phoneMetadataSync";

// Force dynamic rendering since we use request.cookies for authentication
export const dynamic = 'force-dynamic';

/**
 * Filter phone configs by user role and allotted areas
 * Same logic as getAllowedPhoneConfigs but works with Meta-fetched configs
 */
function filterPhoneConfigsByRole(
  configs: any[],
  userRole: string,
  userAreas: string[] = []
): any[] {
  // Full access roles see all numbers
  if (FULL_ACCESS_ROLES.includes(userRole as any)) {
    return configs;
  }

  // Check if user has WhatsApp access at all
  if (!WHATSAPP_ACCESS_ROLES.includes(userRole as any)) {
    return [];
  }

  // Filter by user's assigned areas
  const normalizedAreas = userAreas.map(a => a.toLowerCase().trim());
  
  // "all" or "both" gives access to all areas
  if (normalizedAreas.includes("all") || normalizedAreas.includes("both")) {
    return configs;
  }

  return configs.filter(config => {
    if (!config.phoneNumberId) return false;
    
    // Support both single area and array of areas
    const configAreas = Array.isArray(config.area) ? config.area : [config.area];
    
    // Check if any of the user's areas match any of the phone's areas
    return configAreas.some((phoneArea: string) => normalizedAreas.includes(phoneArea));
  });
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
    const businessAccountId = "2394287697653581"; // WhatsApp Business Account ID
    const metaPhones = await fetchPhoneNumbersFromMeta(businessAccountId);
    
    // Create area mapping from existing configs (to preserve area assignments)
    // config.ts is source of truth for area/location assignments
    const areaMapping = new Map<string, string | string[]>();
    WHATSAPP_PHONE_CONFIGS.forEach(config => {
      if (config.phoneNumberId) {
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
