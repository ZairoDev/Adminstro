import { NextRequest, NextResponse } from "next/server";
import type { PipelineStage } from "mongoose";
import { connectDb } from "@/util/db";
import { Boosters } from "@/models/propertyBooster";
import { getDataFromToken } from "@/util/getDataFromToken";
import { applyLocationFilter, isLocationExempt } from "@/util/apiSecurity";

export const dynamic = "force-dynamic";

const ALLOWED_SORT_FIELDS = new Set(["lastReboostedAt", "createdAt"]);
const FIXED_LOCATION_OPTIONS = ["Athens", "Milan", "Thessaloniki", "Chania", "Rome"] as const;
const DEFAULT_PROPERTY_TYPE_OPTIONS = [
  "Studio",
  "House",
  "1 Bedroom",
  "2 Bedroom",
  "3 Bedroom",
  "4 Bedroom",
  "5 Bedroom",
] as const;
const DEFAULT_FURNISHING_OPTIONS = ["Furnished", "Semi-furnished", "Unfurnished"] as const;

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function exactCaseInsensitive(value: string) {
  return new RegExp(`^${escapeRegex(value)}$`, "i");
}

export async function POST(req: Request) {
  try {
    await connectDb();
    const body = await req.json();
    const { title, location, description, ownerName, ownerPhone, images, createdBy, vsid } = body;

    if (!title || !location || !description || !ownerName || !ownerPhone || !images?.length) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const property = await Boosters.create({
      title,
      location,
      ownerName,
      vsid,
      ownerPhone,
      description,
      images,
      createdBy,
    });

    return NextResponse.json(property, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectDb();

    const token = await getDataFromToken(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Parse query params ──────────────────────────────────────────────────
    const { searchParams } = req.nextUrl;

    const pageParam  = Number(searchParams.get("page"));
    const skipParam  = Number(searchParams.get("skip"));
    const limitParam = Number(searchParams.get("limit"));
    const sortParam  = searchParams.get("sort") ?? "-lastReboostedAt";
    const createdBy       = searchParams.get("createdBy");
    const propertyType    = searchParams.get("propertyType");
    const propertyLocation = searchParams.get("propertyLocation");
    const furnishingStatus = searchParams.get("furnishingStatus");
    const locationParam   = searchParams.get("location");
    const dateFromParam   = searchParams.get("dateFrom");
    const dateToParam     = searchParams.get("dateTo");

    // ── Pagination ──────────────────────────────────────────────────────────
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 100) : 10;
    const page =
      Number.isFinite(pageParam) && pageParam > 0
        ? Math.floor(pageParam)
        : Number.isFinite(skipParam) && skipParam >= 0
        ? Math.floor(skipParam / limit) + 1
        : 1;
    const skip = (page - 1) * limit;

    // ── Sort ────────────────────────────────────────────────────────────────
    const rawSortField  = sortParam.startsWith("-") ? sortParam.slice(1) : sortParam;
    const sortDirection = sortParam.startsWith("-") ? -1 : 1;
    const sortField     = ALLOWED_SORT_FIELDS.has(rawSortField) ? rawSortField : "lastReboostedAt";

    // ── Date range ──────────────────────────────────────────────────────────
    let dateQuery: { $gte: Date; $lte: Date } | undefined;
    if (dateFromParam && dateToParam) {
      const from = new Date(dateFromParam);
      const to   = new Date(dateToParam);
      if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime())) {
        from.setHours(0, 0, 0, 0);
        to.setHours(23, 59, 59, 999);
        dateQuery = { $gte: from, $lte: to };
      }
    }

    // ── Role-based location filter ──────────────────────────────────────────
    const role: string = (token.role ?? "") as string;
    const assignedArea: string | string[] | undefined = token.allotedArea
      ? (Array.isArray(token.allotedArea) ? token.allotedArea : String(token.allotedArea))
      : undefined;

    const boosterQuery: Record<string, unknown> = {};

    if (!isLocationExempt(role)) {
      const loc = locationParam && typeof locationParam === "string" ? locationParam : undefined;
      applyLocationFilter(boosterQuery, role, assignedArea, loc);
    } else if (locationParam && locationParam !== "All") {
      boosterQuery.location = new RegExp(locationParam, "i");
    }

    if (createdBy && createdBy !== "All") boosterQuery.createdBy = createdBy;
    if (dateQuery) boosterQuery.createdAt = dateQuery;

    // ── Description/location-based filters ───────────────────────────────────
    const derivedFieldConditions: Record<string, unknown> = {};
    if (propertyType && propertyType !== "All") {
      derivedFieldConditions.derivedPropertyType = exactCaseInsensitive(propertyType);
    }
    if (propertyLocation && propertyLocation !== "All") {
      derivedFieldConditions.derivedLocation = exactCaseInsensitive(propertyLocation);
    }
    if (furnishingStatus && furnishingStatus !== "All") {
      derivedFieldConditions.derivedFurnishingStatus = exactCaseInsensitive(furnishingStatus);
    }

    // ── Aggregation pipeline ────────────────────────────────────────────────
    const pipeline: PipelineStage[] = [
      { $match: boosterQuery },
      {
        $addFields: {
          _searchText: {
            $toLower: {
              $concat: [
                { $ifNull: ["$description", ""] },
                " ",
                { $ifNull: ["$location", ""] },
              ],
            },
          },
        },
      },
      {
        $addFields: {
          derivedPropertyType: {
            $switch: {
              branches: [
                { case: { $regexMatch: { input: "$_searchText", regex: "(^|\\W)house(\\W|$)" } }, then: "House" },
                { case: { $regexMatch: { input: "$_searchText", regex: "(^|\\W)(1\\s*bed(room)?|one\\s*bed(room)?)(\\W|$)" } }, then: "1 Bedroom" },
                { case: { $regexMatch: { input: "$_searchText", regex: "(^|\\W)(2\\s*bed(room)?|two\\s*bed(room)?)(\\W|$)" } }, then: "2 Bedroom" },
                { case: { $regexMatch: { input: "$_searchText", regex: "(^|\\W)(3\\s*bed(room)?|three\\s*bed(room)?)(\\W|$)" } }, then: "3 Bedroom" },
                { case: { $regexMatch: { input: "$_searchText", regex: "(^|\\W)(4\\s*bed(room)?|four\\s*bed(room)?)(\\W|$)" } }, then: "4 Bedroom" },
                { case: { $regexMatch: { input: "$_searchText", regex: "(^|\\W)(5\\s*bed(room)?|five\\s*bed(room)?)(\\W|$)" } }, then: "5 Bedroom" },
                { case: { $regexMatch: { input: "$_searchText", regex: "(^|\\W)studio(\\W|$)" } }, then: "Studio" },
              ],
              default: "Studio",
            },
          },
          derivedFurnishingStatus: {
            $switch: {
              branches: [
                { case: { $regexMatch: { input: "$_searchText", regex: "(^|\\W)unfurnished(\\W|$)" } }, then: "Unfurnished" },
                { case: { $regexMatch: { input: "$_searchText", regex: "(^|\\W)semi[\\s-]?furnished(\\W|$)" } }, then: "Semi-furnished" },
                { case: { $regexMatch: { input: "$_searchText", regex: "(^|\\W)furnished(\\W|$)" } }, then: "Furnished" },
              ],
              default: "Furnished",
            },
          },
          derivedLocation: {
            $switch: {
              branches: [
                { case: { $regexMatch: { input: "$_searchText", regex: "(^|\\W)athens(\\W|$)" } }, then: "Athens" },
                { case: { $regexMatch: { input: "$_searchText", regex: "(^|\\W)milan(\\W|$)" } }, then: "Milan" },
                { case: { $regexMatch: { input: "$_searchText", regex: "(^|\\W)thessaloniki(\\W|$)" } }, then: "Thessaloniki" },
                { case: { $regexMatch: { input: "$_searchText", regex: "(^|\\W)chania(\\W|$)" } }, then: "Chania" },
                { case: { $regexMatch: { input: "$_searchText", regex: "(^|\\W)rome(\\W|$)" } }, then: "Rome" },
              ],
              default: null,
            },
          },
        },
      },
      ...(Object.keys(derivedFieldConditions).length > 0
        ? [{ $match: derivedFieldConditions } as PipelineStage]
        : []),
      {
        $facet: {
          data: [
            { $sort: { [sortField]: sortDirection } },
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                _id: 1,
                BoostID: 1,
                vsid: 1,
                title: 1,
                description: 1,
                images: 1,
                createdBy: 1,
                createdAt: 1,
                lastReboostedAt: 1,
                location: "$derivedLocation",
                propertyType: "$derivedPropertyType",
                furnishingStatus: "$derivedFurnishingStatus",
              },
            },
          ],
          totalCount: [{ $count: "count" }],
          filterOptions: [
            {
              $project: {
                _id: 0,
                propertyTypes: { $literal: [...DEFAULT_PROPERTY_TYPE_OPTIONS] },
                furnishingStatuses: { $literal: [...DEFAULT_FURNISHING_OPTIONS] },
                locations: { $literal: [...FIXED_LOCATION_OPTIONS] },
              },
            },
          ],
        },
      },
    ];

    const [result] = await Boosters.aggregate(pipeline);
    const properties     = (result?.data as unknown[]) ?? [];
    const totalProperties = Number(result?.totalCount?.[0]?.count ?? 0);
    const filterOptions  = result?.filterOptions?.[0] ?? { propertyTypes: [], locations: [], furnishingStatuses: [] };
    const totalPages     = Math.max(1, Math.ceil(totalProperties / limit));

    return NextResponse.json({
      data: properties,
      totalProperties,
      filterOptions,
      page,
      limit,
      totalPages,
      hasPrevPage: page > 1,
      hasNextPage: page < totalPages,
    });
  } catch (error: unknown) {
    console.error("Error fetching properties:", error);
    return NextResponse.json({ error: "Failed to fetch properties" }, { status: 500 });
  }
}
