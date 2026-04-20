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

    const [mapData, fetchedTableData, total, availableCount, notAvailableCount] = await Promise.all([
      unregisteredOwner.find(mapQuery).limit(1000).lean(),
      unregisteredOwner.find(tableQuery).skip(skip).limit(limit).sort({ createdAt: -1, _id: -1 }).lean(),
      unregisteredOwner.countDocuments(tableQuery),
      unregisteredOwner.countDocuments({ ...baseQuery, availability: "Available" }),
      unregisteredOwner.countDocuments({ ...baseQuery, availability: "Not Available" }),
    ]);

    let tableData = fetchedTableData;
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
