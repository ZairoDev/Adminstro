import { unregisteredOwner } from "@/models/unregisteredOwner";
import {
  geocodeWithGoogle,
  inferCountryCodeFromLocation,
} from "@/util/geocodeGoogle";
import { unregisteredOwnerShortTerm } from "@/models/unregisteredOwnerShortTerm";
// import { geocodeWithNominatim } from "@/util/geocodeNominatim";
import type { Model, Types } from "mongoose";

export interface LocationGeoPoint {
  type: "Point";
  coordinates: [number, number];
}

export interface OwnerGeoFields {
  address?: string | null;
  location?: string | null;
  area?: string | null;
}

/** Fields that trigger a locationGeo re-sync when saved via the owner sheet API */
export const GEO_TRIGGER_FIELDS = new Set<keyof OwnerGeoFields>([
  "address",
  "location",
  "area",
]);

export function isGeoTriggerField(
  field: string,
): field is keyof OwnerGeoFields {
  return GEO_TRIGGER_FIELDS.has(field as keyof OwnerGeoFields);
}

const GEO_PLACEHOLDER_VALUES = new Set(["unknown", "n/a", "na", "-"]);

const URL_LIKE_PATTERN =
  /^(https?:\/\/|www\.)/i;

const URL_HOST_PATTERN =
  /\b(airbnb\.|booking\.com|google\.com\/maps|maps\.app\.goo\.gl|goo\.gl\/maps|bit\.ly|t\.co|facebook\.com|instagram\.com)\b/i;

function sanitizeGeoPart(value: unknown): string {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    return "";
  }
  if (GEO_PLACEHOLDER_VALUES.has(normalized.toLowerCase())) {
    return "";
  }
  return normalized;
}

/** True when the value looks like a URL / listing link, not a postal address. */
export function isLinkLikeGeoValue(value: unknown): boolean {
  const normalized = sanitizeGeoPart(value);
  if (!normalized) {
    return false;
  }
  if (URL_LIKE_PATTERN.test(normalized)) {
    return true;
  }
  if (URL_HOST_PATTERN.test(normalized)) {
    return true;
  }
  // domain.tld/... pasted without scheme (not a street address with a leading number)
  if (
    /^[a-z0-9][-a-z0-9.]*\.[a-z]{2,}(\/|$)/i.test(normalized) &&
    !/^\d{1,5}\s/.test(normalized)
  ) {
    return true;
  }
  return false;
}

export function isGeocodableAddress(value: unknown): boolean {
  const normalized = sanitizeGeoPart(value);
  return normalized.length > 0 && !isLinkLikeGeoValue(normalized);
}

function dedupeQueries(queries: string[]): string[] {
  return [
    ...new Set(
      queries.map((query) => query.trim()).filter((query) => query.length > 0),
    ),
  ];
}

/** Street/postal address queries (skipped when address is empty or link-like). */
export function buildAddressGeocodeCandidates(
  input: OwnerGeoFields,
): string[] {
  const address = isGeocodableAddress(input.address)
    ? sanitizeGeoPart(input.address)
    : "";
  const location = sanitizeGeoPart(input.location);
  const area = sanitizeGeoPart(input.area);

  if (!address) {
    return [];
  }

  return dedupeQueries([
    [address, location, area].filter(Boolean).join(", "),
    [address, area].filter(Boolean).join(", "),
    [address, location].filter(Boolean).join(", "),
    address,
  ]);
}

/** City/area fallback when address is missing, link-like, or geocoding failed. */
export function buildPlaceGeocodeCandidates(input: OwnerGeoFields): string[] {
  const location = sanitizeGeoPart(input.location);
  const area = sanitizeGeoPart(input.area);

  return dedupeQueries([
    [location, area].filter(Boolean).join(", "),
    area,
    location,
  ]);
}

/** All candidates in priority order (address tier, then place tier). */
export function buildGeocodeQueryCandidates(
  input: OwnerGeoFields,
): string[] {
  return dedupeQueries([
    ...buildAddressGeocodeCandidates(input),
    ...buildPlaceGeocodeCandidates(input),
  ]);
}

export function hasGeocodableFields(input: OwnerGeoFields): boolean {
  return (
    buildAddressGeocodeCandidates(input).length > 0 ||
    buildPlaceGeocodeCandidates(input).length > 0
  );
}

export function isValidLocationGeo(input: unknown): input is LocationGeoPoint {
  if (
    typeof input !== "object" ||
    input === null ||
    !("type" in input) ||
    (input as LocationGeoPoint).type !== "Point" ||
    !("coordinates" in input) ||
    !Array.isArray((input as LocationGeoPoint).coordinates)
  ) {
    return false;
  }

  const coordinates = (input as LocationGeoPoint).coordinates;
  if (coordinates.length !== 2) {
    return false;
  }

  const [lng, lat] = coordinates;
  const validLng = Number.isFinite(lng) && lng >= -180 && lng <= 180;
  const validLat = Number.isFinite(lat) && lat >= -90 && lat <= 90;
  return validLng && validLat;
}

function resolveCountryCodesForGeocode(
  input: OwnerGeoFields,
): string[] | undefined {
  const inferred = inferCountryCodeFromLocation(input.location);
  return inferred ? [inferred] : undefined;
}

async function geocodeQueryTier(
  queries: string[],
  countryCodes: string[] | undefined,
): Promise<LocationGeoPoint | null> {
  for (const query of queries) {
    const geo = await geocodeWithGoogle(query, {
      countryCodes,
      maxRetries: 3,
    });

    if (geo) {
      return {
        type: "Point",
        coordinates: [geo.lng, geo.lat],
      };
    }
  }
  return null;
}

export async function resolveLocationGeo(
  input: OwnerGeoFields,
): Promise<LocationGeoPoint | null> {
  const addressCandidates = buildAddressGeocodeCandidates(input);
  const placeCandidates = buildPlaceGeocodeCandidates(input);

  if (addressCandidates.length === 0 && placeCandidates.length === 0) {
    return null;
  }

  const countryCodes = resolveCountryCodesForGeocode(input);

  const fromAddress = await geocodeQueryTier(addressCandidates, countryCodes);
  if (fromAddress) {
    return fromAddress;
  }

  const triedAddress = new Set(addressCandidates);
  const remainingPlace = placeCandidates.filter((q) => !triedAddress.has(q));
  return geocodeQueryTier(remainingPlace, countryCodes);
}

export type SyncLocationGeoResult =
  | { status: "updated"; locationGeo: LocationGeoPoint }
  | { status: "cleared" }
  | { status: "unchanged" }
  | { status: "failed" };

export function resolveLocationGeoAfterSync(
  result: SyncLocationGeoResult,
  existing: LocationGeoPoint | null | undefined,
): LocationGeoPoint | null {
  if (result.status === "updated") {
    return result.locationGeo;
  }
  if (result.status === "cleared") {
    return null;
  }
  return existing ?? null;
}

/**
 * Persists geocoded coordinates for an owner.
 * - On success: updates locationGeo.
 * - On failure: keeps existing locationGeo (Geo Search pins stay valid).
 * - When address/location/area are all empty: clears locationGeo only then.
 */
async function syncLocationGeoForOwnerModel(
  model: Model<any>,
  ownerId: Types.ObjectId | string,
  fields: OwnerGeoFields,
): Promise<SyncLocationGeoResult> {
  if (!hasGeocodableFields(fields)) {
    const unset = await model.updateOne(
      { _id: ownerId },
      { $unset: { locationGeo: "" } },
    );
    return unset.modifiedCount > 0
      ? { status: "cleared" }
      : { status: "unchanged" };
  }

  const resolved = await resolveLocationGeo(fields);
  if (!resolved) {
    return { status: "failed" };
  }

  await model.updateOne(
    { _id: ownerId },
    { $set: { locationGeo: resolved } },
  );
  return { status: "updated", locationGeo: resolved };
}

export async function syncLocationGeoForOwner(
  ownerId: Types.ObjectId | string,
  fields: OwnerGeoFields,
): Promise<SyncLocationGeoResult> {
  return syncLocationGeoForOwnerModel(unregisteredOwner, ownerId, fields);
}

export async function syncLocationGeoForShortTermOwner(
  ownerId: Types.ObjectId | string,
  fields: OwnerGeoFields,
): Promise<SyncLocationGeoResult> {
  return syncLocationGeoForOwnerModel(
    unregisteredOwnerShortTerm,
    ownerId,
    fields,
  );
}

function scheduleLocationGeoSyncForModel(
  model: Model<any>,
  ownerId: Types.ObjectId | string,
  fields: OwnerGeoFields,
  label: string,
): void {
  void syncLocationGeoForOwnerModel(model, ownerId, fields).catch(
    (error: unknown) => {
      console.error(
        `[geocode] Background sync failed for ${label} owner ${String(ownerId)}`,
        error,
      );
    },
  );
}

/** Non-blocking geocode after Owner Sheet save; errors are logged only. */
export function scheduleLocationGeoSync(
  ownerId: Types.ObjectId | string,
  fields: OwnerGeoFields,
): void {
  scheduleLocationGeoSyncForModel(
    unregisteredOwner,
    ownerId,
    fields,
    "long-term",
  );
}

export function scheduleShortTermLocationGeoSync(
  ownerId: Types.ObjectId | string,
  fields: OwnerGeoFields,
): void {
  scheduleLocationGeoSyncForModel(
    unregisteredOwnerShortTerm,
    ownerId,
    fields,
    "short-term",
  );
}
