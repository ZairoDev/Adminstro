import { NextRequest, NextResponse } from "next/server";
  import type { PipelineStage } from "mongoose";
import { z } from "zod";

import { Area } from "@/models/area";
import { unregisteredOwner } from "@/models/unregisteredOwner";
import { applyLocationFilter, isLocationExempt } from "@/util/apiSecurity";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";

const EARTH_RADIUS_M = 6_378_100;

const filtersSchema = z
  .object({
    searchType: z.string().optional().default(""),
    searchValue: z.string().optional().default(""),
    propertyType: z.string().optional().default(""),
    place: z.array(z.string()).optional().default([]),
    area: z.array(z.string()).optional().default([]),
    zone: z.string().optional().default(""),
    metroZone: z.string().optional().default(""),   
    minPrice: z.number().nullable().optional().default(0),
    maxPrice: z.number().nullable().optional().default(0),      
    sortByPrice: z.enum(["asc", "desc", ""]).optional().default(""),
    isImportant: z.boolean().optional().default(false),
    isPinned: z.boolean().optional().default(false),
  })
  .optional()
  .default({});

const nearbySearchSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  mode: z.enum(["radius", "corridor"]).optional().default("radius"),
  destination: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    })
    .optional(),
  corridorWidthMeters: z.number().int().positive().max(20000).optional().default(2000),
  radiusMeters: z.number().int().positive().max(50000).optional().default(5000),
  limit: z.number().int().positive().max(200).optional().default(50),
  page: z.number().int().positive().optional().default(1),
  selectedTab: z.enum(["available", "notAvailable"]).optional().default("available"),
  statusMode: z.enum(["available", "notAvailable", "both"]).optional().default("both"),
  focusOwnerId: z.string().optional(),
  zoom: z.number().int().min(1).max(22).optional().default(11),
  mapOnly: z.boolean().optional().default(false),
  filters: filtersSchema,
});

function zoomToMapCap(zoom: number): number {
  if (zoom <= 8) return 200;
  if (zoom <= 10) return 400;
  if (zoom <= 12) return 800;
  if (zoom <= 14) return 1500;
  return 3000;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function strictRegex(value: string): RegExp {
  return new RegExp(`^\\s*${escapeRegex(value)}\\s*$`, "i");
}

function parsePriceBounds(price: unknown): { min: number; max: number } | null {
  if (price === null || price === undefined) {
    return null;
  }
  const raw = String(price).trim();
  if (!raw) {
    return null;
  }

  // Capture numeric tokens and optional scale suffix (k/m).
  // Examples:
  // - "AED 1,500" => 1500
  // - "2.5k" => 2500
  // - "1m" => 1000000
  // - "500-700" => [500,700]
  const tokenRegex = /(\d[\d,]*(?:\.\d+)?)\s*([kKmM])?/g;
  const extracted: number[] = [];
  let match: RegExpExecArray | null;
  while ((match = tokenRegex.exec(raw)) !== null) {
    const numericPart = Number(match[1].replace(/,/g, ""));
    if (!Number.isFinite(numericPart)) {
      continue;
    }
    const suffix = match[2]?.toLowerCase();
    const multiplier = suffix === "k" ? 1_000 : suffix === "m" ? 1_000_000 : 1;
    extracted.push(numericPart * multiplier);
  }

  if (extracted.length === 0) {
    return null;
  }

  // Ignore obvious non-price tiny numbers (e.g. "2bhk") when real price tokens exist.
  const hasRealisticPrice = extracted.some((n) => n >= 100);
  const candidates = hasRealisticPrice ? extracted.filter((n) => n >= 100) : extracted;
  if (candidates.length === 0) {
    return null;
  }

  const min = Math.min(...candidates);
  const max = Math.max(...candidates);
  return { min, max };
}

function isPriceWithinRange(
  price: unknown,
  minPrice: number,
  maxPrice: number,
): boolean {
  const bounds = parsePriceBounds(price);
  if (bounds === null) {
    return false;
  }

  // Only min set: row passes if its max can reach that min threshold.
  if (minPrice > 0 && maxPrice <= 0) {
    return bounds.max >= minPrice;
  }

  // Only max set: row passes if its min is within or below that max threshold.
  if (maxPrice > 0 && minPrice <= 0) {
    return bounds.min <= maxPrice;
  }

  // Both set: treat row price and filter as ranges and keep overlaps.
  if (minPrice > 0 && maxPrice > 0) {
    const filterMin = Math.min(minPrice, maxPrice);
    const filterMax = Math.max(minPrice, maxPrice);
    return bounds.max >= filterMin && bounds.min <= filterMax;
  }

  return true;
}

function buildAvailabilityFilter(
  mode: "available" | "notAvailable" | "both",
): string | { $in: string[] } {
  if (mode === "available") {
    return "Available";
  }
  if (mode === "notAvailable") {
    return "Not Available";
  }
  return { $in: ["Available", "Not Available"] };
}

interface LatLng {
  lat: number;
  lng: number;
}

interface GeoDoc extends Record<string, unknown> {
  locationGeo?: {
    coordinates?: [number, number];
  };
}

function normalizeRadians(angle: number): number {
  return ((angle + Math.PI) % (2 * Math.PI)) - Math.PI;
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function toDegrees(value: number): number {
  return (value * 180) / Math.PI;
}

function computeBearing(origin: LatLng, destination: LatLng): number {
  const lat1 = toRadians(origin.lat);
  const lat2 = toRadians(destination.lat);
  const deltaLng = toRadians(destination.lng - origin.lng);

  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);
  return Math.atan2(y, x);
}

function destinationPoint(
  origin: LatLng,
  bearingRad: number,
  distanceMeters: number,
): LatLng {
  const angularDistance = distanceMeters / EARTH_RADIUS_M;
  const lat1 = toRadians(origin.lat);
  const lng1 = toRadians(origin.lng);

  const sinLat1 = Math.sin(lat1);
  const cosLat1 = Math.cos(lat1);
  const sinAngular = Math.sin(angularDistance);
  const cosAngular = Math.cos(angularDistance);

  const lat2 = Math.asin(
    sinLat1 * cosAngular + cosLat1 * sinAngular * Math.cos(bearingRad),
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearingRad) * sinAngular * cosLat1,
      cosAngular - sinLat1 * Math.sin(lat2),
    );

  return {
    lat: toDegrees(lat2),
    lng: toDegrees(normalizeRadians(lng2)),
  };
}

function crossTrackDistanceMeters(
  point: LatLng,
  segmentStart: LatLng,
  segmentEnd: LatLng,
): number {
  const d13 = haversineDistanceMeters(segmentStart, point) / EARTH_RADIUS_M;
  const theta13 = computeBearing(segmentStart, point);
  const theta12 = computeBearing(segmentStart, segmentEnd);
  return Math.abs(Math.asin(Math.sin(d13) * Math.sin(theta13 - theta12)) * EARTH_RADIUS_M);
}

function alongTrackDistanceMeters(
  point: LatLng,
  segmentStart: LatLng,
  segmentEnd: LatLng,
): number {
  const d13 = haversineDistanceMeters(segmentStart, point) / EARTH_RADIUS_M;
  const theta13 = computeBearing(segmentStart, point);
  const theta12 = computeBearing(segmentStart, segmentEnd);
  const dxt = Math.asin(Math.sin(d13) * Math.sin(theta13 - theta12));
  const ratio = Math.cos(d13) / Math.cos(dxt);
  const clamped = Math.max(-1, Math.min(1, ratio));
  return Math.acos(clamped) * EARTH_RADIUS_M;
}

function haversineDistanceMeters(origin: LatLng, destination: LatLng): number {
  const lat1 = toRadians(origin.lat);
  const lat2 = toRadians(destination.lat);
  const deltaLat = lat2 - lat1;
  const deltaLng = toRadians(destination.lng - origin.lng);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}

function buildCorridorPolygon(
  origin: LatLng,
  destination: LatLng,
  halfWidthMeters: number,
): [number, number][] {
  const forwardBearing = computeBearing(origin, destination);
  const leftBearing = forwardBearing - Math.PI / 2;
  const rightBearing = forwardBearing + Math.PI / 2;

  const originLeft = destinationPoint(origin, leftBearing, halfWidthMeters);
  const originRight = destinationPoint(origin, rightBearing, halfWidthMeters);
  const destinationLeft = destinationPoint(
    destination,
    leftBearing,
    halfWidthMeters,
  );
  const destinationRight = destinationPoint(
    destination,
    rightBearing,
    halfWidthMeters,
  );

  return [
    [originLeft.lng, originLeft.lat],
    [destinationLeft.lng, destinationLeft.lat],
    [destinationRight.lng, destinationRight.lat],
    [originRight.lng, originRight.lat],
    [originLeft.lng, originLeft.lat],
  ];
}

function withDistanceFromDestination<T extends GeoDoc>(
  owners: T[],
  destination: LatLng | null,
): Array<T & { distanceFromDestinationMeters?: number }> {
  if (!destination) {
    return owners.map(
      (owner) => owner as T & { distanceFromDestinationMeters?: number },
    );
  }

  return owners.map((owner) => {
    const coordinates = owner.locationGeo?.coordinates;
    if (!coordinates || coordinates.length !== 2) {
      return owner;
    }
    const [lng, lat] = coordinates;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return owner;
    }
    return {
      ...owner,
      distanceFromDestinationMeters: haversineDistanceMeters(
        { lat, lng },
        destination,
      ),
    };
  });
}

async function applyCommonFilters(
  query: Record<string, unknown>,
  filters: z.infer<typeof filtersSchema>,
  role: string,
  assignedArea: string | string[] | undefined,
): Promise<void> {
  if (filters.searchType && filters.searchValue) {
    query[filters.searchType] = new RegExp(filters.searchValue, "i");
  }

  if (filters.isImportant) {
    query.isImportant = "Important";
  }
  if (filters.isPinned) {
    query.isPinned = "Pinned";
  }

  if (filters.propertyType.trim()) {
    query.propertyType = strictRegex(filters.propertyType.trim());
  }

  if (filters.place.length > 0) {
    const locations = filters.place.map((item) => String(item).trim()).filter(Boolean);
    if (locations.length > 0) {
      query.$or = locations.map((loc) => ({
        location: { $regex: new RegExp(`^${escapeRegex(loc)}$`, "i") },
      }));
    }
  } else {
    applyLocationFilter(query, role, assignedArea, undefined);
  }

  if (!isLocationExempt(role) && Array.isArray(query.$or) && Array.isArray(assignedArea)) {
    const allowed = new Set(assignedArea.map((a) => String(a).toLowerCase()));
    const filtered = (query.$or as Array<{ location?: { $regex?: RegExp } }>).filter((entry) => {
      const regex = entry.location?.$regex;
      if (!regex) return false;
      const raw = regex.source.replace(/^\^/, "").replace(/\$$/, "");
      return allowed.has(raw.toLowerCase());
    });
    query.$or = filtered.length > 0 ? filtered : [{ location: { $in: [] } }];
  }

  if (filters.area.length > 0) {
    query.area = { $in: filters.area.map((a) => new RegExp(`^${escapeRegex(a)}$`, "i")) };
  }

  if (filters.zone && filters.place.length > 0) {
    const areasInZone = await Area.find({ zone: filters.zone }).select("name").lean();
    const areaNames = areasInZone.map((a) => a.name);
    query.area = areaNames.length > 0 ? { $in: areaNames } : { $in: [] };
  }

  if (filters.metroZone && filters.place.length > 0) {
    const areasInMetroZone = await Area.find({ metroZone: filters.metroZone }).select("name").lean();
    const areaNames = areasInMetroZone.map((a) => a.name);
    query.area = areaNames.length > 0 ? { $in: areaNames } : { $in: [] };
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Auth — getDataFromToken throws a plain {status, code} object.
  // Preserve non-auth infra errors (e.g. DB/DNS outage) as 503 so client does not force logout.
  try {
    await getDataFromToken(req);
  } catch (err: unknown) {
    const error = err as { status?: number; code?: string };
    if (error?.status && error.status !== 401) {
      return NextResponse.json(
        { error: "Service unavailable", code: error.code ?? "SERVICE_UNAVAILABLE" },
        { status: error.status },
      );
    }
    return NextResponse.json({ error: "Unauthorized", code: error?.code ?? "AUTH_FAILED" }, { status: 401 });
  }

  // Body validation
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = nearbySearchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const {
    lat,
    lng,
    mode,
    destination,
    corridorWidthMeters,
    radiusMeters,
    limit,
    page,
    selectedTab,
    statusMode,
    focusOwnerId,
    zoom,
    mapOnly,
    filters,
  } = parsed.data;

  if (mode === "corridor" && !destination) {
    return NextResponse.json(
      { error: "destination is required for corridor mode" },
      { status: 400 },
    );
  }

  // DB query
  try {
    await connectDb();

    const token = await getDataFromToken(req);
    const role = String((token as { role?: unknown })?.role ?? "");
    const alloted = (token as { allotedArea?: unknown })?.allotedArea;
    const assignedArea =
      Array.isArray(alloted) || typeof alloted === "string"
        ? (alloted as string[] | string)
        : undefined;

    const searchOrigin: LatLng = { lat, lng };
    const searchDestination: LatLng | null =
      mode === "corridor" && destination
        ? { lat: destination.lat, lng: destination.lng }
        : null;

    // Corridor mode keeps the polygon as a hard filter inside $geoNear;
    // radius mode uses $geoNear's maxDistance directly.
    const mapGeoQuery: Record<string, unknown> =
      mode === "corridor" && searchDestination
        ? {
            locationGeo: {
              $geoWithin: {
                $geometry: {
                  type: "Polygon",
                  coordinates: [
                    buildCorridorPolygon(
                      searchOrigin,
                      searchDestination,
                      corridorWidthMeters / 2,
                    ),
                  ],
                },
              },
            },
          }
        : {};

    await applyCommonFilters(mapGeoQuery, filters, role, assignedArea);

    const mapQueryForNear: Record<string, unknown> = {
      ...mapGeoQuery,
      availability: buildAvailabilityFilter(statusMode),
    };

    const minPrice = Number(filters.minPrice ?? 0);
    const maxPrice = Number(filters.maxPrice ?? 0);
    const shouldApplyPriceFilter =
      (Number.isFinite(minPrice) && minPrice > 0) ||
      (Number.isFinite(maxPrice) && maxPrice > 0);

    const mapCap = zoomToMapCap(zoom);
    // When a price filter is active, we must fetch extra headroom because
    // Mongo cannot filter on the free-form price string. We then filter in
    // Node and re-cap so zoom caps remain accurate.
    const geoNearLimit = shouldApplyPriceFilter ? Math.max(mapCap * 5, 2000) : mapCap;

    const geoNearStage: Record<string, unknown> = {
      near: { type: "Point", coordinates: [lng, lat] },
      distanceField: "distanceFromOriginMeters",
      spherical: true,
      key: "locationGeo",
      query: mapQueryForNear,
    };
    if (mode !== "corridor") {
      geoNearStage.maxDistance = radiusMeters;
    }

    const mapPipeline: PipelineStage[] = [
      { $geoNear: geoNearStage } as PipelineStage,
      { $limit: geoNearLimit },
    ];

    const rawMapDataPromise = unregisteredOwner
      .aggregate(mapPipeline)
      .exec() as Promise<GeoDoc[]>;

    // Table query is unchanged: its geometry filter mirrors the original behaviour
    // (polygon for corridor, $centerSphere for radius) and is paginated by
    // createdAt + _id for stable ordering. Skipping when mapOnly is set.
    const tableGeoFilter =
      mode === "corridor" && searchDestination
        ? {
            $geoWithin: {
              $geometry: {
                type: "Polygon",
                coordinates: [
                  buildCorridorPolygon(
                    searchOrigin,
                    searchDestination,
                    corridorWidthMeters / 2,
                  ),
                ],
              },
            },
          }
        : {
            $geoWithin: {
              $centerSphere: [[lng, lat], radiusMeters / EARTH_RADIUS_M],
            },
          };

    const tableBaseQuery: Record<string, unknown> = {
      locationGeo: tableGeoFilter,
    };
    await applyCommonFilters(tableBaseQuery, filters, role, assignedArea);

    const tableQuery: Record<string, unknown> = {
      ...tableBaseQuery,
      availability: selectedTab === "available" ? "Available" : "Not Available",
    };

    const skip = (page - 1) * limit;

    const [rawMapData, rawTableCandidates] = await Promise.all([
      rawMapDataPromise,
      mapOnly
        ? Promise.resolve([])
        : unregisteredOwner
            .find(tableQuery)
            .sort({ createdAt: -1, _id: -1 })
            .limit(10000)
            .lean(),
    ]);

    const priceFilteredMapData = shouldApplyPriceFilter
      ? (rawMapData as GeoDoc[]).filter((owner) =>
          isPriceWithinRange((owner as { price?: unknown }).price, minPrice, maxPrice),
        )
      : (rawMapData as GeoDoc[]);

    // Corridor refinement: drop rows whose perpendicular distance to the
    // origin→destination line exceeds halfWidth, or whose along-track
    // position falls outside the segment. This removes the four "cap"
    // corner fringes that $geoWithin polygon can include.
    let refinedMapData = priceFilteredMapData;
    if (mode === "corridor" && searchDestination) {
      const halfWidth = corridorWidthMeters / 2;
      const segmentLength = haversineDistanceMeters(searchOrigin, searchDestination);
      refinedMapData = priceFilteredMapData.filter((owner) => {
        const coordinates = owner.locationGeo?.coordinates;
        if (!coordinates || coordinates.length !== 2) {
          return false;
        }
        const [ownerLng, ownerLat] = coordinates;
        if (!Number.isFinite(ownerLat) || !Number.isFinite(ownerLng)) {
          return false;
        }
        const ownerPoint: LatLng = { lat: ownerLat, lng: ownerLng };
        const crossTrack = crossTrackDistanceMeters(
          ownerPoint,
          searchOrigin,
          searchDestination,
        );
        if (crossTrack > halfWidth) {
          return false;
        }
        const alongTrack = alongTrackDistanceMeters(
          ownerPoint,
          searchOrigin,
          searchDestination,
        );
        return alongTrack >= 0 && alongTrack <= segmentLength;
      });
    }

    // Re-cap after Node-side filters so zoom caps remain accurate.
    const cappedMapData = refinedMapData.slice(0, mapCap);

    const mapData = withDistanceFromDestination(cappedMapData, searchDestination);

    const availableCount = mapData.filter((owner) => owner.availability === "Available").length;
    const notAvailableCount = mapData.filter(
      (owner) => owner.availability === "Not Available",
    ).length;
    const mapTruncated = refinedMapData.length >= mapCap;

    if (mapOnly) {
      return NextResponse.json(
        {
          mode,
          radiusMeters,
          corridorWidthMeters,
          originToDestinationMeters: searchDestination
            ? haversineDistanceMeters(searchOrigin, searchDestination)
            : undefined,
          mapData,
          mapCap,
          mapTruncated,
          availableCount,
          notAvailableCount,
          meta:
            mapData.length === 0
              ? "No properties found in the selected radius. This usually means there are no geocoded records nearby yet."
              : undefined,
        },
        { status: 200 },
      );
    }

    const priceFilteredTableCandidates = shouldApplyPriceFilter
      ? rawTableCandidates.filter((owner) =>
          isPriceWithinRange((owner as { price?: unknown }).price, minPrice, maxPrice),
        )
      : rawTableCandidates;

    // Apply the same corridor refinement to table candidates to keep map
    // and table aligned under corridor mode.
    let refinedTableCandidates = priceFilteredTableCandidates;
    if (mode === "corridor" && searchDestination) {
      const halfWidth = corridorWidthMeters / 2;
      const segmentLength = haversineDistanceMeters(searchOrigin, searchDestination);
      refinedTableCandidates = priceFilteredTableCandidates.filter((owner) => {
        const coordinates = (owner as GeoDoc).locationGeo?.coordinates;
        if (!coordinates || coordinates.length !== 2) {
          return false;
        }
        const [ownerLng, ownerLat] = coordinates;
        if (!Number.isFinite(ownerLat) || !Number.isFinite(ownerLng)) {
          return false;
        }
        const ownerPoint: LatLng = { lat: ownerLat, lng: ownerLng };
        const crossTrack = crossTrackDistanceMeters(
          ownerPoint,
          searchOrigin,
          searchDestination,
        );
        if (crossTrack > halfWidth) {
          return false;
        }
        const alongTrack = alongTrackDistanceMeters(
          ownerPoint,
          searchOrigin,
          searchDestination,
        );
        return alongTrack >= 0 && alongTrack <= segmentLength;
      });
    }

    const tableCandidates = withDistanceFromDestination(
      refinedTableCandidates,
      searchDestination,
    );

    const total = tableCandidates.length;

    let tableData = tableCandidates.slice(skip, skip + limit);
    if (focusOwnerId) {
      const alreadyIncluded = tableData.some((owner) => String(owner._id) === focusOwnerId);
      if (!alreadyIncluded) {
        const focusedOwner = await unregisteredOwner
          .findOne({ ...tableQuery, _id: focusOwnerId })
          .lean();
        if (focusedOwner) {
          tableData = [focusedOwner as (typeof tableData)[number], ...tableData].slice(0, limit);
        }
      }
    }

    return NextResponse.json(
      {
        count: tableData.length,
        mode,
        radiusMeters,
        corridorWidthMeters,
        originToDestinationMeters: searchDestination
          ? haversineDistanceMeters(searchOrigin, searchDestination)
          : undefined,
        mapData,
        mapCap,
        mapTruncated,
        tableData,
        total,
        availableCount,
        notAvailableCount,
        meta:
          mapData.length === 0
            ? "No properties found in the selected radius. This usually means there are no geocoded records nearby yet."
            : undefined,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("[nearby] query error:", error);
    const message = error instanceof Error ? error.message : "MongoDB query failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
