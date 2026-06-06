import { isAdminRole, isLocationExempt } from "@/util/apiSecurity";
import { normalizeAllotedArea } from "@/util/location";

/** SuperAdmin, Admin, Developer, Advert, LeadGen*, etc. — all cities in filter + data */
export function hasFullOwnerSheetLocationAccess(role: string): boolean {
  const normalized = (role || "").trim();
  return isLocationExempt(normalized) || isAdminRole(normalized);
}

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

  if (hasFullOwnerSheetLocationAccess(role)) {
    if (requested.length === 0) {
      return { locations: [], denyAll: false };
    }
    return { locations: requested, denyAll: false };
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

/** First letter uppercase, rest lowercase (e.g. athens → Athens). */
export function titleCaseOwnerSheetCity(city: string): string {
  const trimmed = (city || "").trim();
  if (!trimmed) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

function matchCityCase(
  city: string,
  targets?: { city: string }[],
): string {
  const trimmed = (city || "").trim();
  if (!trimmed) return "";
  const match = targets?.find(
    (t) => t.city.toLowerCase() === trimmed.toLowerCase(),
  );
  if (match) return match.city;
  return titleCaseOwnerSheetCity(trimmed);
}

/** Canonical city for DB + UI: target casing if known, else title case. */
export function normalizeOwnerSheetCityName(
  city: string,
  targets?: { city: string }[],
): string {
  return matchCityCase(city, targets);
}

export function findOwnerSheetTargetByCity<T extends { city: string }>(
  targets: T[],
  city: string,
): T | undefined {
  const key = (city || "").trim().toLowerCase();
  if (!key) return undefined;
  return targets.find((t) => (t.city || "").trim().toLowerCase() === key);
}

/**
 * Fallback city for location-exempt roles (e.g. SuperAdmin) that have no
 * allotted area configured and no active location filter.
 */
export const DEFAULT_OWNER_ROW_LOCATION = "Athens";

/**
 * Resolve the default city for a NEW owner-sheet row.
 *
 * Priority:
 *  1. Active location filter (validated against allocations for restricted roles).
 *  2. First allotted city.
 *  3. For location-exempt roles only: DEFAULT_OWNER_ROW_LOCATION (Athens).
 *  4. Otherwise "" — caller must block creation (restricted user, no allocation).
 */
export function resolveDefaultOwnerRowLocation(params: {
  role?: string;
  tokenAllotedArea: unknown;
  filterPlace?: unknown;
  targets?: { city: string }[];
}): string {
  const { role = "", targets } = params;
  const exempt = hasFullOwnerSheetLocationAccess(role);
  const allocations = parseAllotedAreaForClient(params.tokenAllotedArea);
  const requested = extractPlaceLocations(params.filterPlace);

  // 1. Active location filter wins.
  if (requested.length > 0) {
    const req = requested[0];
    // Exempt roles (or users with no allocation) may use any filtered city.
    if (exempt || allocations.length === 0) {
      return matchCityCase(req, targets);
    }
    const allowed = allocations.find(
      (a) => a.toLowerCase() === req.toLowerCase(),
    );
    return matchCityCase(allowed ?? allocations[0], targets);
  }

  // 2. First allotted city.
  if (allocations.length > 0) {
    return matchCityCase(allocations[0], targets);
  }

  // 3. Exempt roles default to Athens.
  if (exempt) {
    return matchCityCase(DEFAULT_OWNER_ROW_LOCATION, targets);
  }

  // 4. Restricted user with no allocation — cannot resolve a location.
  return "";
}

/** One entry per city (case-insensitive) — avoids duplicate React keys in selects. */
export function dedupeOwnerSheetTargetsByCity<T extends { city: string }>(
  targets: T[],
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const t of targets) {
    const key = (t.city || "").trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

/** Cities the user may pick in the location column / filter dropdown. */
export function filterOwnerSheetTargetCities<T extends { _id?: string; city: string }>(
  targets: T[],
  tokenAllotedArea: unknown,
  role: string,
): T[] {
  let filtered: T[];
  if (hasFullOwnerSheetLocationAccess(role)) {
    filtered = targets;
  } else {
    const allocations = parseAllotedAreaForClient(tokenAllotedArea);
    if (allocations.length === 0) {
      return [];
    }
    const allowed = new Set(allocations.map((a) => a.toLowerCase()));
    filtered = targets.filter((t) => allowed.has(t.city.toLowerCase()));
  }
  return dedupeOwnerSheetTargetsByCity(filtered);
}

export const OWNER_SHEET_FILTER_STORAGE_KEY = "owner-sheet-filters-v1";
export const OWNER_SHEET_SHORT_TERM_FILTER_STORAGE_KEY =
  "owner-sheet-short-term-filters-v1";
