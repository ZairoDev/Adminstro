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

export function canAssignWhatsAppParticipantLocation(
  user: LocationAssignUser
): boolean {
  const role = (user.role || "").trim();
  if ((FULL_ACCESS_ROLES as readonly string[]).includes(role)) return true;
  const email = (user.email || "").trim().toLowerCase();
  if (email === WHATSAPP_LOCATION_ASSIGN_EMAIL) return true;
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
