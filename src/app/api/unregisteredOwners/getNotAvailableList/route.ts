
import { FiltersInterface } from "@/app/dashboard/newproperty/filteredProperties/page";
import { FiltersInterfaces } from "@/app/spreadsheet/FilterBar";
import { Area } from "@/models/area";
import { unregisteredOwner } from "@/models/unregisteredOwner";
import Employees from "@/models/employee";
import { connectDb } from "@/util/db";
import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { applyLocationFilter, isLocationExempt } from "@/util/apiSecurity";

connectDb();
export async function POST(req: NextRequest) {
  try{
    const token = await getDataFromToken(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const role: string = (token.role || "") as string;
    const assignedArea: string | string[] | undefined = token.allotedArea
      ? Array.isArray(token.allotedArea)
        ? token.allotedArea
        : typeof token.allotedArea === "string"
        ? token.allotedArea
        : undefined
      : undefined;

    const employeeId = String((token as any)?.id || "");
    const ownerRuleDoc = employeeId
      ? await Employees.findById(employeeId)
          .select("ownerLocationBlock ownerPropertyTypeVisibilityRules")
          .lean()
      : null;
    const ownerBlocked = new Set(
      Array.isArray((ownerRuleDoc as any)?.ownerLocationBlock?.all)
        ? ((ownerRuleDoc as any).ownerLocationBlock.all as any[]).map(String)
        : [],
    );

    const { filters , page=1 , limit=50}  : { filters: FiltersInterfaces; page: number ; limit: number} =
        await req.json();
    const query: Record<string, any> = {};

    const extractLocations = (raw: any): string[] => {
      const arr = Array.isArray(raw) ? raw.flat() : [];
      return arr
        .map((x: any) => {
          if (typeof x === "string") return x;
          if (x && typeof x === "object") return x.city || x.value || x.label || "";
          return "";
        })
        .map((s: any) => String(s).trim())
        .filter(Boolean);
    };
    
  
    query["availability"]= "Not Available";
    // console.log("filters: ", filters);
    if (filters.searchType && filters.searchValue)
      query[filters.searchType] = new RegExp(filters.searchValue, "i");

    if (filters.propertyType) query["propertyType"] = filters.propertyType;
    const ownerVisAll = (ownerRuleDoc as any)?.ownerPropertyTypeVisibilityRules?.all;
    const ownerVisByLocation = (ownerRuleDoc as any)?.ownerPropertyTypeVisibilityRules?.byLocation;
    const getOwnerVisRuleForLocation = (locKey: string) => {
      const byLoc =
        ownerVisByLocation && typeof (ownerVisByLocation as any).get === "function"
          ? (ownerVisByLocation as any).get(locKey)
          : (ownerVisByLocation as any)?.[locKey];
      return byLoc || ownerVisAll || null;
    };
    // if (filters.rentalType === "Long Term") query["rentalType"] = "Long Term";
    let effectiveLocationsForRules: string[] = [];
    if (filters.place) {
  const locations = extractLocations(filters.place);

  if (filters.isImportant) {
  query["isImportant"] = "Important"; // or whatever value you use for important items
}

if (filters.isPinned) {
  query["isPinned"] = "Pinned"; // or whatever value you use for important items
}

  if (locations.length > 0) {
    if (!isLocationExempt(role)) {
      const userAreas = Array.isArray(assignedArea)
        ? assignedArea.map((a: string) => a.toLowerCase())
        : assignedArea
        ? [String(assignedArea).toLowerCase()]
        : [];
      const valid = locations
        .filter((loc: string) => userAreas.includes(loc.toLowerCase()))
        .filter((loc: string) => !ownerBlocked.has(loc.toLowerCase()));
      effectiveLocationsForRules = valid.map(String);
      if (valid.length > 0) {
        query["$or"] = valid.map((loc: string) => ({
          location: { $regex: new RegExp(`^${loc}$`, "i") }
        }));
      } else {
        query["$or"] = [{ location: { $in: [] } }];
      }
    } else {
      const allowed = locations.filter((loc: string) => !ownerBlocked.has(loc.toLowerCase()));
      effectiveLocationsForRules = allowed.map(String);
      query["$or"] = allowed.map((loc: string) => ({
        location: { $regex: new RegExp(`^${loc}$`, "i") }
      }));
    }
  }
}
    else if (!isLocationExempt(role)) {
      const assignedFiltered = Array.isArray(assignedArea)
        ? assignedArea.filter((a: any) => !ownerBlocked.has(String(a).toLowerCase()))
        : assignedArea && !ownerBlocked.has(String(assignedArea).toLowerCase())
        ? assignedArea
        : [];
      effectiveLocationsForRules = Array.isArray(assignedFiltered)
        ? (assignedFiltered as any[]).map(String)
        : assignedFiltered
        ? [String(assignedFiltered)]
        : [];
      applyLocationFilter(query, role, assignedFiltered as any, undefined);
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
    // Load employee owner rules (if employee exists)
    const employeeId = String(token?.id || "");
    const employee =
      employeeId && employeeId !== "test-superadmin"
        ? await Employees.findById(employeeId)
            .select("ownerPricingRules ownerVisibilityRules ownerLocationBlock")
            .lean()
        : null;

    applyOwnerLocationBlockToQuery({
      query,
      blockedLocations: (employee as any)?.ownerLocationBlock?.all,
    });

    const visibilityRes = applyOwnerVisibilityRulesByLocationToQuery({
      query,
      rules: (employee as any)?.ownerVisibilityRules || null,
      locations: effectiveLocations,
      uiInteriorStatus: undefined,
      uiPropertyType: filters.propertyType,
      uiPetStatus: undefined,
    });
    if (visibilityRes.impossible) {
      return NextResponse.json({ data: [], total: 0 }, { status: 200 });
    }

    const pricingRes = applyOwnerPricingRulesByLocationToQuery({
      query,
      pricingRules: (employee as any)?.ownerPricingRules || null,
      uiMinPrice: filters.minPrice,
      uiMaxPrice: filters.maxPrice,
      locations: effectiveLocations,
    });
    if (pricingRes.impossible) {
      return NextResponse.json({ data: [], total: 0 }, { status: 200 });
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