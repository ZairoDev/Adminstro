/**
 * Client-safe area helpers (no Mongoose / server models).
 * Used by UI and shared privilege modules.
 */

import { normalizeCityKey } from "@/lib/city-normalizer";

export type PhoneLocationOption = {
  displayName: string;
  locationKey: string;
};

export type LocationAssignUser = {
  role?: string;
  email?: string;
  allotedArea?: string | string[];
};

/** Normalize an array of display-city labels to lowercase keys */
export function normalizeAreas(areas: string[]): string[] {
  return areas.map(normalizeCityKey).filter(Boolean);
}

/** Convert a display location string to a normalized key */
export function locationKeyFromDisplay(location: string): string {
  return normalizeCityKey(location);
}

/**
 * Parse allotedArea from a JWT token into a clean string[].
 * Handles: string, string[], comma-separated string.
 */
/** Parse GET /api/whatsapp/configured-locations body into display city names. */
export function parseConfiguredLocationDisplays(payload: {
  locations?: unknown;
  locationDisplays?: unknown;
}): string[] {
  if (Array.isArray(payload.locationDisplays)) {
    return payload.locationDisplays.filter(
      (x): x is string => typeof x === "string" && x.trim().length > 0
    );
  }
  if (!Array.isArray(payload.locations)) return [];
  return payload.locations
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object") {
        const display = (item as { displayName?: unknown }).displayName;
        return typeof display === "string" ? display.trim() : "";
      }
      return "";
    })
    .filter(Boolean);
}

export function getUserAreasFromToken(token: {
  allotedArea?: string | string[] | undefined;
}): string[] {
  const raw = token.allotedArea;
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String).map((a) => a.trim()).filter(Boolean);
  if (typeof raw === "string") {
    return raw.split(",").map((a) => a.trim()).filter(Boolean);
  }
  return [];
}
