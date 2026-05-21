import { unregisteredOwner } from "@/models/unregisteredOwner";
import { geocodeWithNominatim } from "@/util/geocodeNominatim";
import type { Types } from "mongoose";

export interface LocationGeoPoint {
  type: "Point";
  coordinates: [number, number];
}

export interface OwnerGeoFields {
  address?: string | null;
  location?: string | null;
  area?: string | null;
}

const GEO_PLACEHOLDER_VALUES = new Set(["unknown", "n/a", "na", "-"]);

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

/** Address-first queries; falls back to area + location when address is empty. */
export function buildGeocodeQueryCandidates(
  input: OwnerGeoFields,
): string[] {
  const address = sanitizeGeoPart(input.address);
  const location = sanitizeGeoPart(input.location);
  const area = sanitizeGeoPart(input.area);

  const candidates: string[] = [];

  if (address) {
    candidates.push(
      [address, location, area].filter(Boolean).join(", "),
      [address, area].filter(Boolean).join(", "),
      [address, location].filter(Boolean).join(", "),
      address,
    );
  } else {
    candidates.push(
      [location, area].filter(Boolean).join(", "),
      area,
      location,
    );
  }

  return [
    ...new Set(
      candidates.map((query) => query.trim()).filter((query) => query.length > 0),
    ),
  ];
}

export function hasGeocodableFields(input: OwnerGeoFields): boolean {
  return buildGeocodeQueryCandidates(input).length > 0;
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

function getNominatimUserAgent(): string {
  return process.env.NOMINATIM_USER_AGENT ?? "admin-property-app/1.0";
}

export async function resolveLocationGeo(
  input: OwnerGeoFields,
): Promise<LocationGeoPoint | null> {
  const candidates = buildGeocodeQueryCandidates(input);
  if (candidates.length === 0) {
    return null;
  }

  for (const query of candidates) {
    const geo = await geocodeWithNominatim(query, {
      delayMs: 1100,
      maxRetries: 3,
      userAgent: getNominatimUserAgent(),
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

export type SyncLocationGeoResult =
  | { status: "updated"; locationGeo: LocationGeoPoint }
  | { status: "cleared" }
  | { status: "unchanged" }
  | { status: "failed" };

/**
 * Persists geocoded coordinates for an owner.
 * - On success: updates locationGeo.
 * - On failure: keeps existing locationGeo (Geo Search pins stay valid).
 * - When address/location/area are all empty: clears locationGeo only then.
 */
export async function syncLocationGeoForOwner(
  ownerId: Types.ObjectId | string,
  fields: OwnerGeoFields,
): Promise<SyncLocationGeoResult> {
  if (!hasGeocodableFields(fields)) {
    const unset = await unregisteredOwner.updateOne(
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

  await unregisteredOwner.updateOne(
    { _id: ownerId },
    { $set: { locationGeo: resolved } },
  );
  return { status: "updated", locationGeo: resolved };
}

/** Non-blocking geocode after Owner Sheet save; errors are logged only. */
export function scheduleLocationGeoSync(
  ownerId: Types.ObjectId | string,
  fields: OwnerGeoFields,
): void {
  void syncLocationGeoForOwner(ownerId, fields).catch((error: unknown) => {
    console.error(
      `[geocode] Background sync failed for owner ${String(ownerId)}`,
      error,
    );
  });
}
