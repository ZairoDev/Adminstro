/**
 * WhatsApp Business Phone Number Configuration
 * Maps city/area to their respective WhatsApp Business phone number IDs
 * 
 * Each Greek city has its own WhatsApp Business number for local support
 */

export type WhatsAppArea = "athens" | "thessaloniki" | "crete" | "all";

export interface WhatsAppPhoneConfig {
  phoneNumberId: string;
  displayNumber: string;
  displayName: string;
  area: WhatsAppArea;
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
export const WHATSAPP_RETARGET_PHONE_ID = process.env.WHATSAPP_RETARGET_PHONE_ID || "";

// Configuration for each WhatsApp Business phone number by area
// Update these with your actual phone number IDs from Meta Business Suite
export const WHATSAPP_PHONE_CONFIGS: WhatsAppPhoneConfig[] = [
  {
    phoneNumberId:
      process.env.WHATSAPP_ATHENS_PHONE_ID || process.env.Phone_number_ID || "",
    displayNumber: "+91 28 0000 0003 ",
    displayName: "VacationSaga Athens",
    area: "athens",
    businessAccountId: WHATSAPP_BUSINESS_ACCOUNT_ID,
  },
  {
    phoneNumberId: process.env.WHATSAPP_THESSALONIKI_PHONE_ID || "",
    displayNumber: "+30 9125119177",
    displayName: "VacationSaga Thessaloniki",
    area: "thessaloniki",
    businessAccountId: WHATSAPP_BUSINESS_ACCOUNT_ID,
  },
  {
    phoneNumberId: process.env.WHATSAPP_CRETE_PHONE_ID || "",
    displayNumber: "+30 28 0000 0003",
    displayName: "VacationSaga Crete",
    area: "crete",
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
  "LeadGen",
  "LeadGen-TeamLead",
  "Developer",
] as const;

// Roles that have WhatsApp access (area-restricted)
export const WHATSAPP_ACCESS_ROLES = [
  "SuperAdmin",
  "Admin",
  "Sales",
  "Sales-TeamLead",
  "LeadGen",
  "LeadGen-TeamLead",
  "Developer",
] as const;

/**
 * Get phone configs accessible by a user based on their role and area
 */
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

  // Filter by user's assigned areas
  const normalizedAreas = userAreas.map(a => a.toLowerCase().trim());
  
  // "all" or "both" gives access to all areas
  if (normalizedAreas.includes("all") || normalizedAreas.includes("both")) {
    return WHATSAPP_PHONE_CONFIGS.filter(config => config.phoneNumberId);
  }

  return WHATSAPP_PHONE_CONFIGS.filter(config => {
    if (!config.phoneNumberId) return false;
    return normalizedAreas.includes(config.area);
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
