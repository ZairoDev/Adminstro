import { NextRequest, NextResponse } from "next/server";
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
  radiusMeters: z.number().int().positive().max(50000).optional().default(5000),
  limit: z.number().int().positive().max(200).optional().default(50),
  page: z.number().int().positive().optional().default(1),
  selectedTab: z.enum(["available", "notAvailable"]).optional().default("available"),
  statusMode: z.enum(["available", "notAvailable", "both"]).optional().default("both"),
  focusOwnerId: z.string().optional(),
  filters: filtersSchema,
});

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

  const { lat, lng, radiusMeters, limit, page, selectedTab, statusMode, focusOwnerId, filters } = parsed.data;

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

    const baseQuery: Record<string, unknown> = {
      locationGeo: {
        $geoWithin: {
          $centerSphere: [[lng, lat], radiusMeters / EARTH_RADIUS_M],
        },
      },
    };

    await applyCommonFilters(baseQuery, filters, role, assignedArea);

    const mapQuery: Record<string, unknown> = {
      ...baseQuery,
      availability: buildAvailabilityFilter(statusMode),
    };
    const tableQuery: Record<string, unknown> = {
      ...baseQuery,
      availability: selectedTab === "available" ? "Available" : "Not Available",
    };

    const skip = (page - 1) * limit;

    const [rawMapData, rawTableCandidates] = await Promise.all([
      unregisteredOwner.find(mapQuery).sort({ createdAt: -1, _id: -1 }).limit(10000).lean(),
      unregisteredOwner.find(tableQuery).sort({ createdAt: -1, _id: -1 }).limit(10000).lean(),
    ]);

    const minPrice = Number(filters.minPrice ?? 0);
    const maxPrice = Number(filters.maxPrice ?? 0);
    const shouldApplyPriceFilter =
      (Number.isFinite(minPrice) && minPrice > 0) ||
      (Number.isFinite(maxPrice) && maxPrice > 0);

    const mapData = shouldApplyPriceFilter
      ? rawMapData.filter((owner) => isPriceWithinRange(owner.price, minPrice, maxPrice))
      : rawMapData;

    const tableCandidates = shouldApplyPriceFilter
      ? rawTableCandidates.filter((owner) => isPriceWithinRange(owner.price, minPrice, maxPrice))
      : rawTableCandidates;

    const total = tableCandidates.length;
    const availableCount = mapData.filter((owner) => owner.availability === "Available").length;
    const notAvailableCount = mapData.filter(
      (owner) => owner.availability === "Not Available",
    ).length;

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
        radiusMeters,
        mapData,
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
