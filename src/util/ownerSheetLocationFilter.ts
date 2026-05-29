import { isLocationExempt } from "@/util/apiSecurity";
import { normalizeAllotedArea } from "@/util/location";

function splitAllotedAreaRaw(raw: unknown): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.flatMap((v) => String(v).split(",").map((s) => s.trim())).filter(Boolean);
  }
  if (typeof raw === "string") {
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

/** Parse allotedArea for API matching (lowercase, deduped). */
export function parseAllotedAreaFromToken(raw: unknown): string[] {
  return normalizeAllotedArea(splitAllotedAreaRaw(raw));
}

/** Parse allotedArea for UI filters (preserve casing from token/DB). */
export function parseAllotedAreaForClient(raw: unknown): string[] {
  const parts = splitAllotedAreaRaw(raw);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const key = p.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

export function extractPlaceLocations(place: unknown): string[] {
  if (!Array.isArray(place) || place.length === 0) return [];
  return place
    .flat()
    .map((x) => {
      if (typeof x === "string") return x.trim();
      if (x && typeof x === "object") {
        return String(
          (x as { city?: string; value?: string; label?: string }).city ||
            (x as { value?: string }).value ||
            (x as { label?: string }).label ||
            "",
        ).trim();
      }
      return "";
    })
    .filter(Boolean);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function locationRegexForCity(city: string): RegExp {
  return new RegExp(`^${escapeRegex(city.trim())}$`, "i");
}

/**
 * Resolve which owner-sheet cities a user may see.
 * Restricted roles (e.g. sales-intern) are always capped to token allotedArea.
 */
export function resolveOwnerSheetLocations(params: {
  role: string;
  tokenAllotedArea: unknown;
  requestedPlace: unknown;
  ownerBlocked: Set<string>;
}): { locations: string[]; denyAll: boolean } {
  const { role, tokenAllotedArea, requestedPlace, ownerBlocked } = params;
  const userAreas = parseAllotedAreaFromToken(tokenAllotedArea);
  const requested = extractPlaceLocations(requestedPlace);

  const dropBlocked = (locs: string[]) =>
    locs.filter((loc) => !ownerBlocked.has(loc.trim().toLowerCase()));

  if (isLocationExempt(role)) {
    if (requested.length === 0) {
      return { locations: [], denyAll: false };
    }
    return { locations: dropBlocked(requested), denyAll: false };
  }

  if (userAreas.length === 0) {
    return { locations: [], denyAll: true };
  }

  if (requested.length > 0) {
    const userAreaSet = new Set(userAreas.map((a) => a.toLowerCase()));
    const valid = requested.filter((loc) => userAreaSet.has(loc.toLowerCase()));
    const filtered = dropBlocked(valid);
    return { locations: filtered, denyAll: filtered.length === 0 };
  }

  return { locations: dropBlocked(userAreas), denyAll: false };
}

export function applyOwnerSheetLocationQuery(
  query: Record<string, unknown>,
  locations: string[],
): void {
  if (locations.length === 0) {
    query.$or = [{ location: { $in: [] } }];
    return;
  }
  query.$or = locations.map((loc) => ({
    location: { $regex: locationRegexForCity(loc) },
  }));
}
