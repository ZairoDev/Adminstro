
import { FiltersInterface } from "@/app/dashboard/newproperty/filteredProperties/page";
import { FiltersInterfaces } from "@/app/spreadsheet/FilterBar";
import { Area } from "@/models/area";
import { unregisteredOwner } from "@/models/unregisteredOwner";
import Employees from "@/models/employee";
import { connectDb } from "@/util/db";
import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { isLocationExempt } from "@/util/apiSecurity";
import {
  applyOwnerSheetLocationQuery,
  parseAllotedAreaFromToken,
  resolveOwnerSheetLocations,
} from "@/util/ownerSheetLocationFilter";

connectDb();
export async function POST(req: NextRequest) {
  try{
    const token = await getDataFromToken(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const role: string = (token.role || "") as string;

    const employeeId = String((token as any)?.id || "");
    const ownerRuleDoc = employeeId
      ? await Employees.findById(employeeId)
          .select(
            "allotedArea ownerLocationBlock ownerPropertyTypeVisibilityRules",
          )
          .lean()
      : null;

    let tokenAllotedArea: unknown = (token as { allotedArea?: unknown }).allotedArea;
    if (
      !isLocationExempt(role) &&
      parseAllotedAreaFromToken(tokenAllotedArea).length === 0 &&
      ownerRuleDoc
    ) {
      tokenAllotedArea = (ownerRuleDoc as { allotedArea?: unknown }).allotedArea;
    }
    const ownerBlocked = new Set(
      Array.isArray((ownerRuleDoc as any)?.ownerLocationBlock?.all)
        ? ((ownerRuleDoc as any).ownerLocationBlock.all as any[]).map(String)
        : [],
    );

    const { filters , page=1 , limit=50, upcomingOnly = false}  : { filters: FiltersInterfaces; page: number ; limit: number; upcomingOnly?: boolean} =
        await req.json();
    const query: Record<string, any> = {};

    query["availability"]= "Not Available";
    if (upcomingOnly) {
      const now = new Date();
      const oneMonthFromNow = new Date();
      oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
      query.unavailableUntil = {
        $gte: now,
        $lte: oneMonthFromNow,
      };
    }
    // console.log("filters: ", filters);
    if (filters.searchType && filters.searchValue)
      query[filters.searchType] = new RegExp(filters.searchValue, "i");

    const ownerVisAll = (ownerRuleDoc as any)?.ownerPropertyTypeVisibilityRules?.all;
    const ownerVisByLocation = (ownerRuleDoc as any)?.ownerPropertyTypeVisibilityRules?.byLocation;
    const getOwnerVisRuleForLocation = (locKey: string) => {
      const byLoc =
        ownerVisByLocation && typeof (ownerVisByLocation as any).get === "function"
          ? (ownerVisByLocation as any).get(locKey)
          : (ownerVisByLocation as any)?.[locKey];
      return byLoc || ownerVisAll || null;
    };
    if (filters.isImportant) {
      query["isImportant"] = "Important";
    }
    if (filters.isPinned) {
      query["isPinned"] = "Pinned";
    }

    const { locations: sheetLocations, denyAll } = resolveOwnerSheetLocations({
      role,
      tokenAllotedArea,
      requestedPlace: filters?.place,
      ownerBlocked,
    });

    if (denyAll) {
      return NextResponse.json({ data: [], total: 0 }, { status: 200 });
    }

    let effectiveLocationsForRules: string[] = [];
    if (sheetLocations.length > 0) {
      applyOwnerSheetLocationQuery(query, sheetLocations);
      effectiveLocationsForRules = sheetLocations;
    } else if (!isLocationExempt(role)) {
      return NextResponse.json({ data: [], total: 0 }, { status: 200 });
    }

    const propertyTypeFilter = String(filters.propertyType || "").trim();
    const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const strictValueRegex = (s: string) => new RegExp(`^\\s*${escapeRegex(s)}\\s*$`, "i");

    const locationsForRules = effectiveLocationsForRules;

    if (locationsForRules.length > 0) {
      const clauses: any[] = [];
      for (const loc of locationsForRules) {
        const locKey = String(loc).toLowerCase();
        const rule = getOwnerVisRuleForLocation(locKey);
        const allowedTypes = Array.isArray(rule?.allowedPropertyType)
          ? rule.allowedPropertyType
          : [];
        const enabled = Boolean(rule?.enabled) && allowedTypes.length > 0;

        if (enabled) {
          if (propertyTypeFilter) {
            const ok = allowedTypes.some((t: string) => t.toLowerCase() === propertyTypeFilter.toLowerCase());
            if (!ok) continue;
          }
          clauses.push({
            location: { $regex: new RegExp(`^${escapeRegex(loc)}$`, "i") },
            ...(propertyTypeFilter
              ? { propertyType: strictValueRegex(propertyTypeFilter) }
              : { propertyType: { $in: allowedTypes.map((t: string) => strictValueRegex(t)) } }),
          });
        } else {
          clauses.push({
            location: { $regex: new RegExp(`^${escapeRegex(loc)}$`, "i") },
            ...(propertyTypeFilter
              ? { propertyType: strictValueRegex(propertyTypeFilter) }
              : {}),
          });
        }
      }

      if (clauses.length === 0) {
        return NextResponse.json({ data: [], total: 0 }, { status: 200 });
      }

      query.$or = clauses;
      if (query.propertyType) delete query.propertyType;
    } else {
      const rule = ownerVisAll || null;
      const allowedTypes = Array.isArray(rule?.allowedPropertyType) ? rule.allowedPropertyType : [];
      const enabled = Boolean(rule?.enabled) && allowedTypes.length > 0;
      if (enabled) {
        if (propertyTypeFilter) {
          const ok = allowedTypes.some((t: string) => t.toLowerCase() === propertyTypeFilter.toLowerCase());
          if (!ok) return NextResponse.json({ data: [], total: 0 }, { status: 200 });
        } else {
          query.propertyType = { $in: allowedTypes.map((t: string) => strictValueRegex(t)) };
        }
      }
      if (propertyTypeFilter) {
        query.propertyType = strictValueRegex(propertyTypeFilter);
      }
    }
     if (filters.area?.length) {
      // exact match any of selected areas (case-insensitive)
      query["area"] = { $in: filters.area.map((a) => new RegExp(`^${a}$`, "i")) };
    }
     if (filters.place && filters.zone) {
      const areasInZone = await Area.find({ zone: filters.zone })
        .select("name")
        .lean();

      const areaNames = areasInZone.map((a) => a.name);
      // console.log("Areas in selected zone:", areaNames);

      // If we found areas in that zone, filter owners by those areas
      if (areaNames.length > 0) {
        query.area = { $in: areaNames };
      }
    }
    if (filters.place && filters.metroZone) {
      const areasInMetroZone = await Area.find({ metroZone: filters.metroZone })
        .select("name")
        .lean();

      const areaNames = areasInMetroZone.map((a) => a.name);
      // console.log("Areas in selected zone:", areaNames);

      // If we found areas in that zone, filter owners by those areas
      if (areaNames.length > 0) {
        query.area = { $in: areaNames };
      }
    }
    
    const skip = (page - 1) * limit;

let data;
if (filters.sortByPrice) {
  // ✅ Use aggregation when sorting by price (string → number conversion)
  data = await unregisteredOwner.aggregate([
    { $match: query },
    {
      $addFields: {
        numericPrice: {
          $convert: {
            input: { $trim: { input: "$price" } },
            to: "double",
            onError: null,
            onNull: null,
          },
        },
      },
    },
    { $sort: { numericPrice: filters.sortByPrice === "asc" ? 1 : -1 , _id:-1} },
    { $skip: (page - 1) * limit },
    { $limit: limit },
  ]);
} else {
  // ✅ Normal sorting by creation date
  data = await unregisteredOwner
    .find(query)
    .skip((page - 1) * limit)
    .limit(limit)
    .lean()
    .sort({ createdAt: -1 , _id: -1 });
}

     const total = await unregisteredOwner.countDocuments(query);
    // console.log(data);
    return NextResponse.json({data,total    }, {status: 200});
  }catch(err){
    console.log(err);
    return NextResponse.json({error: err}, {status: 500});
  }
}