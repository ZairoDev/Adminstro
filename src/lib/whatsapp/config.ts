/**
 * WhatsApp Business Phone Number Configuration
 * Maps city/area to their respective WhatsApp Business phone number IDs
 * 
 * Each Greek city has its own WhatsApp Business number for local support
 */

import { normalizeCityKey } from "@/lib/city-normalizer";

export type WhatsAppArea =
  | "athens"
  | "piraeus"
  | "glyfada"
  | "thessaloniki"
  | "halkidiki"
  | "milan"
  | "rome"
  | "chania"
  | "all";

export interface WhatsAppPhoneConfig {
  phoneNumberId: string;
  displayNumber: string;
  displayName: string;
  area: WhatsAppArea | WhatsAppArea[]; // Support single area or array of areas
  businessAccountId: string;
  /**
   * If true, this is an internal-only "phone" that:
   * - Never sends messages to Meta
   * - Never triggers notifications
   * - Doesn't appear in Phone Health
   * - Used for internal notes and drafting
   */
  isInternal?: boolean;
}

// =========================================================
// "YOU" VIRTUAL NUMBER CONFIGURATION
// =========================================================
// This is a special internal-only WhatsApp identity for notes,
// internal replies, and drafting. Messages sent from "You":
// - Are saved to DB
// - Appear instantly in chat
// - Never reach Meta API
// - Never trigger notifications
// - Have no delivery status updates

export const INTERNAL_YOU_PHONE_ID = "internal-you";

export const INTERNAL_YOU_CONFIG: WhatsAppPhoneConfig = {
  phoneNumberId: INTERNAL_YOU_PHONE_ID,
  displayNumber: "Internal",
  displayName: "You (Internal Notes)",
  area: "all",
  businessAccountId: "",
  isInternal: true,
};

/**
 * Check if a phone ID is the internal "You" virtual number
 */
export function isInternalPhoneId(phoneNumberId: string): boolean {
  return phoneNumberId === INTERNAL_YOU_PHONE_ID;
}

// WhatsApp Business Account ID (shared across all numbers)
export const WHATSAPP_BUSINESS_ACCOUNT_ID = process.env.WhatsApp_Business_Account_ID || "";

// Retargeting-specific phone ID (used exclusively for retargeting campaigns)
export const WHATSAPP_RETARGET_PHONE_ID = process.env.WHATSAPP_ATHENS_PHONE_ID|| "";

// Configuration for each WhatsApp Business phone number by area
// Phone A: Athens region (athens, piraeus, glyfada)
// Phone B: North Greece (thessaloniki, halkidiki)
// Phone C: Italy (milan, rome)
// Phone Chania: Crete (chania)
export const WHATSAPP_PHONE_CONFIGS: WhatsAppPhoneConfig[] = [
  {
    // Phone A — Athens region
    phoneNumberId:
      process.env.WHATSAPP_PHONE_A_ID ||
      process.env.WHATSAPP_ATHENS_PHONE_ID ||
      process.env.Phone_number_ID ||
      "",
    displayNumber: "+30 Athens",
    displayName: "VacationSaga Athens Region",
    area: ["athens", "piraeus", "glyfada"],
    businessAccountId: WHATSAPP_BUSINESS_ACCOUNT_ID,
  },
  {
    // Phone B — North Greece
    phoneNumberId:
      process.env.WHATSAPP_PHONE_B_ID ||
      process.env.WHATSAPP_THESSALONIKI_PHONE_ID ||
      "",
    displayNumber: "+30 9125119177",
    displayName: "VacationSaga North Greece",
    area: ["thessaloniki", "halkidiki"],
    businessAccountId: WHATSAPP_BUSINESS_ACCOUNT_ID,
  },
  {
    // Phone C — Italy
    phoneNumberId: process.env.WHATSAPP_PHONE_C_ID || "",
    displayNumber: "+39 Italy",
    displayName: "VacationSaga Italy",
    area: ["milan", "rome"],
    businessAccountId: WHATSAPP_BUSINESS_ACCOUNT_ID,
  },
  {
    // Chania — Crete
    phoneNumberId: process.env.WHATSAPP_CHANIA_PHONE_ID || "",
    displayNumber: "+30 28 0000 0003",
    displayName: "VacationSaga Crete",
    area: "chania",
    businessAccountId: WHATSAPP_BUSINESS_ACCOUNT_ID,
  },
];

// WhatsApp Cloud API configuration
export const WHATSAPP_API_VERSION = "v24.0";
export const WHATSAPP_API_BASE_URL = `https://graph.facebook.com/${WHATSAPP_API_VERSION}`;

// Get WhatsApp access token
export const getWhatsAppToken = (): string => {
  return process.env.whatsapp_token || "";
};

// Roles that have access to ALL WhatsApp numbers
export const FULL_ACCESS_ROLES = [
  "SuperAdmin",
  "Admin",

  "Developer",
] as const;

// Roles that have WhatsApp access (area-restricted)
export const WHATSAPP_ACCESS_ROLES = [
  "SuperAdmin",
  "Admin",
  "Advert",
  "Sales",
  "sales-intern",
  "Sales-TeamLead",
  "LeadGen",
  "LeadGen-TeamLead",
  "Developer",
] as const;

/**
 * One inbox for all roles: list/filter by location visibility, not by phone tab.
 * Outbound sends still use each conversation's businessPhoneId.
 */
export function usesUnifiedWhatsAppInbox(_userRole?: string): boolean {
  return true;
}

export function getAllowedPhoneConfigs(
  userRole: string,
  userAreas: string[] = []
): WhatsAppPhoneConfig[] {
  // Full access roles can access all numbers
  if (FULL_ACCESS_ROLES.includes(userRole as any)) {
    return WHATSAPP_PHONE_CONFIGS.filter(config => config.phoneNumberId);
  }

  // Check if user has WhatsApp access at all
  if (!WHATSAPP_ACCESS_ROLES.includes(userRole as any)) {
    return [];
  }

  // Filter by user's assigned areas (display names → keys, e.g. "Athens" → athens)
  const normalizedAreas = userAreas.map((a) => normalizeCityKey(a)).filter(Boolean);

  // HR sometimes omits `allotedArea` on Sales/LeadGen. That used to yield zero
  // allowed phones while the inbox could still show a line, and POST
  // /conversations returned 403 "area mismatch". Advert keeps strict empty =
  // no lines (retarget flows supply the phone separately).
  const UNALLOCATED_AREA_USES_ALL_LINES: readonly string[] = [
    "Sales",
    "sales-intern",
    "Sales-TeamLead",
    "LeadGen",
    "LeadGen-TeamLead",
  ];
  if (
    normalizedAreas.length === 0 &&
    UNALLOCATED_AREA_USES_ALL_LINES.includes(userRole)
  ) {
    return WHATSAPP_PHONE_CONFIGS.filter(
      (config) => config.phoneNumberId && !config.isInternal
    );
  }

  // "all" or "both" gives access to all areas
  if (normalizedAreas.includes("all") || normalizedAreas.includes("both")) {
    return WHATSAPP_PHONE_CONFIGS.filter(config => config.phoneNumberId);
  }

  return WHATSAPP_PHONE_CONFIGS.filter(config => {
    if (!config.phoneNumberId) return false;
    
    // Support both single area and array of areas
    const configAreas = Array.isArray(config.area) ? config.area : [config.area];
    
    return configAreas.some((phoneArea) =>
      normalizedAreas.includes(normalizeCityKey(String(phoneArea))),
    );
  });
}

/**
 * Get array of phone number IDs accessible by a user
 */
export function getAllowedPhoneIds(
  userRole: string,
  userAreas: string[] = []
): string[] {
  return getAllowedPhoneConfigs(userRole, userAreas)
    .map(config => config.phoneNumberId)
    .filter(Boolean);
}

/**
 * Check if a user can access a specific phone number ID
 */
export function canAccessPhoneId(
  phoneNumberId: string,
  userRole: string,
  userAreas: string[] = []
): boolean {
  const allowedIds = getAllowedPhoneIds(userRole, userAreas);
  return allowedIds.includes(phoneNumberId);
}

/**
 * Get phone config by phone number ID
 */
export function getPhoneConfigById(phoneNumberId: string): WhatsAppPhoneConfig | undefined {
  return WHATSAPP_PHONE_CONFIGS.find(config => config.phoneNumberId === phoneNumberId);
}

/**
 * Get the phone number ID assigned to a location (e.g. lead's location).
 * Used when opening WhatsApp from a lead so the conversation uses the correct business number.
 * Location is matched case-insensitively (e.g. "Thessaloniki" -> thessaloniki config).
 */
export function getPhoneIdForLocation(location: string | undefined): string | null {
  if (!location?.trim()) return null;
  const key = normalizeCityKey(location);
  const config = WHATSAPP_PHONE_CONFIGS.find((c) => {
    if (!c.phoneNumberId) return false;
    const areas = Array.isArray(c.area) ? c.area : [c.area];
    return areas.some((a) => normalizeCityKey(String(a)) === key);
  });
  return config?.phoneNumberId || null;
}

/**
 * Get the default phone ID for a user (first allowed phone)
 */
export function getDefaultPhoneId(
  userRole: string,
  userAreas: string[] = []
): string | null {
  const configs = getAllowedPhoneConfigs(userRole, userAreas);
  return configs[0]?.phoneNumberId || null;
}

/**
 * Check if user has any WhatsApp access
 */
export function hasWhatsAppAccess(
  userRole: string,
  userAreas: string[] = []
): boolean {
  return getAllowedPhoneIds(userRole, userAreas).length > 0;
}

/** Sales-family roles that use Sales retarget / inbox rules (includes intern). */
export const SALES_WHATSAPP_ROLES = [
  "Sales",
  "sales-intern",
  "Subscription-Sales",
] as const;

export function isSalesWhatsAppRole(role: string): boolean {
  return (SALES_WHATSAPP_ROLES as readonly string[]).includes(role);
}

export function isWhatsAppAccessRole(role: string): boolean {
  return (WHATSAPP_ACCESS_ROLES as readonly string[]).includes(role);
}

/**
 * Get the retarget phone ID (used exclusively for retargeting)
 * Returns null if not configured
 */
export function getRetargetPhoneId(): string | null {
  return WHATSAPP_RETARGET_PHONE_ID || null;
}

/**
 * Check if a phone ID is the retarget phone ID
 */
export function isRetargetPhoneId(phoneNumberId: string): boolean {
  return WHATSAPP_RETARGET_PHONE_ID === phoneNumberId;
}

/**
 * Get all phone configs including the internal "You" number
 * Use this when you need to show all available "senders" in the UI
 */
export function getAllPhoneConfigsWithInternal(
  userRole: string,
  userAreas: string[] = []
): WhatsAppPhoneConfig[] {
  const metaConfigs = getAllowedPhoneConfigs(userRole, userAreas);
  // Always include the internal "You" number for all WhatsApp-enabled users
  if (metaConfigs.length > 0) {
    return [...metaConfigs, INTERNAL_YOU_CONFIG];
  }
  return metaConfigs;
}

/**
 * Get Meta-only phone configs (excludes internal "You" number)
 * Use this for:
 * - Phone Health dashboard
 * - Any Meta API operations
 * - External message sending
 */
export function getMetaOnlyPhoneConfigs(
  userRole: string,
  userAreas: string[] = []
): WhatsAppPhoneConfig[] {
  return getAllowedPhoneConfigs(userRole, userAreas).filter(
    (config) => !config.isInternal
  );
}

/**
 * Format phone number display with location label
 * Format: "Display Name (+phone) [Location]"
 * Example: "VacationSaga Athens (+91 28 0000 0003) [Athens]"
 * 
 * Meta is source of truth for displayName and displayNumber
 * config.ts is source of truth for area/location
 */
export function formatPhoneDisplayWithLocation(
  config: WhatsAppPhoneConfig
): string {
  const displayName = config.displayName || "Unknown";
  const displayNumber = config.displayNumber || "";
  const area = Array.isArray(config.area) 
    ? config.area.map(a => a.charAt(0).toUpperCase() + a.slice(1)).join(", ")
    : config.area.charAt(0).toUpperCase() + config.area.slice(1);
  
  if (displayNumber) {
    return `${displayName} (${displayNumber}) [${area}]`;
  }
  return `${displayName} [${area}]`;
}
