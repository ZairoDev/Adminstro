import { toDisplayCity } from "@/lib/city-normalizer";
import { FULL_ACCESS_ROLES } from "./config";
import {
  getUserAreasFromToken,
  normalizeAreas,
  type LocationAssignUser,
  type PhoneLocationOption,
} from "./areaTokenUtils";

export type { LocationAssignUser, PhoneLocationOption };

/** Who may assign or change participant city on a WhatsApp conversation */
export const WHATSAPP_LOCATION_ASSIGN_EMAIL = "sangeetajain549@gmail.com";

const CITY_TEAM_ASSIGN_ROLES = [
  "Sales",
  "Sales-TeamLead",
  "LeadGen",
  "LeadGen-TeamLead",
] as const;

/** Inbox city dropdown uses monthly-target list (not allotedArea). */
export const WHATSAPP_GLOBAL_INBOX_LOCATION_ROLES = [
  "SuperAdmin",
  "LeadGen-TeamLead",
] as const;

export function usesGlobalInboxLocationList(role: string): boolean {
  return (WHATSAPP_GLOBAL_INBOX_LOCATION_ROLES as readonly string[]).includes(
    (role || "").trim() as (typeof WHATSAPP_GLOBAL_INBOX_LOCATION_ROLES)[number],
  );
}

export function isWhatsAppLocationCoordinatorEmail(email?: string): boolean {
  return (email || "").trim().toLowerCase() === WHATSAPP_LOCATION_ASSIGN_EMAIL;
}

/** Admin Queue: chats with no participant location key (SuperAdmin + location coordinator). */
export function canAccessWhatsAppAdminQueue(user: LocationAssignUser): boolean {
  const role = (user.role || "").trim();
  if ((FULL_ACCESS_ROLES as readonly string[]).includes(role)) return true;
  if (role === "LeadGen-TeamLead") return true;
  return isWhatsAppLocationCoordinatorEmail(user.email);
}

/** Assigned city keys only (excludes "all" / "both"). */
export function getUserScopedLocationKeys(user: LocationAssignUser): string[] {
  return normalizeAreas(getUserAreasFromToken(user)).filter(
    (key) => key && key !== "all" && key !== "both"
  );
}

/** Inbox city dropdown when user has 2+ assigned locations (SuperAdmin uses monthly-target list). */
export function canUseInboxLocationFilter(user: LocationAssignUser): boolean {
  if (usesGlobalInboxLocationList(user.role || "")) return true;
  return getUserScopedLocationKeys(user).length > 1;
}

export function getInboxLocationFilterOptionsForUser(
  user: LocationAssignUser
): string[] {
  const keys = getUserScopedLocationKeys(user);
  const displays = keys.map((key) => toDisplayCity(key)).filter(Boolean);
  return [...new Set(displays)].sort((a, b) => a.localeCompare(b));
}

export function canAssignWhatsAppParticipantLocation(
  user: LocationAssignUser
): boolean {
  const role = (user.role || "").trim();
  if ((FULL_ACCESS_ROLES as readonly string[]).includes(role)) return true;
  const email = (user.email || "").trim().toLowerCase();
  if (isWhatsAppLocationCoordinatorEmail(email)) return true;
  return (CITY_TEAM_ASSIGN_ROLES as readonly string[]).includes(
    role as (typeof CITY_TEAM_ASSIGN_ROLES)[number]
  );
}

/** Filter a city list by user allotedArea (client-safe). */
export function filterAssignableLocationsForUser(
  phoneLocations: PhoneLocationOption[],
  user: LocationAssignUser
): PhoneLocationOption[] {
  const role = (user.role || "").trim();
  if ((FULL_ACCESS_ROLES as readonly string[]).includes(role)) {
    return phoneLocations;
  }

  const normalizedAreas = normalizeAreas(getUserAreasFromToken(user));

  if (normalizedAreas.length === 0) {
    return phoneLocations;
  }

  if (
    normalizedAreas.includes("all") ||
    normalizedAreas.includes("both")
  ) {
    return phoneLocations;
  }

  return phoneLocations.filter((loc) =>
    normalizedAreas.includes(loc.locationKey)
  );
}
