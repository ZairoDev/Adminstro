import { NextRequest, NextResponse } from "next/server";
import { unregisteredOwner } from "@/models/unregisteredOwner";
import Employees from "@/models/employee";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { enforceOwnerSheetRentalTypeAccess } from "@/lib/enforceEmployeeRentalType";
import { isLocationExempt } from "@/util/apiSecurity";
import {
  applyOwnerSheetLocationQuery,
  hasFullOwnerSheetLocationAccess,
  parseAllotedAreaFromToken,
  resolveOwnerSheetLocations,
} from "@/util/ownerSheetLocationFilter";

connectDb();

export async function POST(req: NextRequest) {  
  try {
    let token: any;
    try {
      token = await getDataFromToken(req);
    } catch (err: any) {
      const status = err?.status ?? 401;
      const code = err?.code ?? "AUTH_FAILED";
      return NextResponse.json({ code }, { status });
    }

    const denied = await enforceOwnerSheetRentalTypeAccess(token, "long-term");
    if (denied) return denied;

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

    let body: any = {};
    const contentLength = req.headers.get("content-length");
    
    if (contentLength && parseInt(contentLength) > 0) {
      try {
        body = await req.json();
      } catch (e) {
        body = {};
      }
    }
    
    const { filters } = body;
    const baseQuery: Record<string, any> = {};

    if (filters?.searchType && filters?.searchValue) {
      const escaped = filters.searchValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      baseQuery[filters.searchType] = new RegExp(escaped, "i");
    }
    const ownerVisAll = (ownerRuleDoc as any)?.ownerPropertyTypeVisibilityRules?.all;
    const ownerVisByLocation = (ownerRuleDoc as any)?.ownerPropertyTypeVisibilityRules?.byLocation;
    const getOwnerVisRuleForLocation = (locKey: string) => {
      const byLoc =
        ownerVisByLocation && typeof (ownerVisByLocation as any).get === "function"
          ? (ownerVisByLocation as any).get(locKey)
          : (ownerVisByLocation as any)?.[locKey];
      return byLoc || ownerVisAll || null;
    };
    const propertyTypeFilter = String(filters?.propertyType || "").trim();
    const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const strictValueRegex = (s: string) => new RegExp(`^\\s*${escapeRegex(s)}\\s*$`, "i");

    if (propertyTypeFilter) {
      baseQuery.propertyType = strictValueRegex(propertyTypeFilter);
    }
    const { locations: sheetLocations, denyAll } = resolveOwnerSheetLocations({
      role,
      tokenAllotedArea,
      requestedPlace: filters?.place,
      ownerBlocked,
    });

    if (denyAll) {
      return NextResponse.json({
        availableCount: 0,
        notAvailableCount: 0,
        upcomingCount: 0,
      });
    }

    let effectiveLocationsForRules: string[] = [];
    if (sheetLocations.length > 0) {
      applyOwnerSheetLocationQuery(baseQuery, sheetLocations);
      effectiveLocationsForRules = sheetLocations;
    } else if (!hasFullOwnerSheetLocationAccess(role)) {
      return NextResponse.json({
        availableCount: 0,
        notAvailableCount: 0,
        upcomingCount: 0,
      });
    }

    // Apply owner property-type rule per effective locations (use actual requested locations)
    const locationsForRules: string[] = effectiveLocationsForRules;

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
            clauses.push({
              location: { $regex: new RegExp(`^${escapeRegex(loc)}$`, "i") },
              propertyType: strictValueRegex(propertyTypeFilter),
            });
          } else {
            clauses.push({
              location: { $regex: new RegExp(`^${escapeRegex(loc)}$`, "i") },
              propertyType: { $in: allowedTypes.map((t: string) => strictValueRegex(t)) },
            });
          }
        } else {
          clauses.push({
            location: { $regex: new RegExp(`^${escapeRegex(loc)}$`, "i") },
            ...(propertyTypeFilter ? { propertyType: strictValueRegex(propertyTypeFilter) } : {}),
          });
        }
      }

      if (clauses.length === 0) {
        return NextResponse.json({ availableCount: 0, notAvailableCount: 0 });
      }

      baseQuery.$or = clauses;
      if (baseQuery.propertyType) delete baseQuery.propertyType;
    } else {
      // no location restriction: apply global rule only
      const rule = ownerVisAll || null;
      const allowedTypes = Array.isArray(rule?.allowedPropertyType) ? rule.allowedPropertyType : [];
      const enabled = Boolean(rule?.enabled) && allowedTypes.length > 0;
      if (enabled) {
        if (propertyTypeFilter) {
          const ok = allowedTypes.some((t: string) => t.toLowerCase() === propertyTypeFilter.toLowerCase());
          if (!ok) return NextResponse.json({ availableCount: 0, notAvailableCount: 0 });
          baseQuery.propertyType = strictValueRegex(propertyTypeFilter);
        } else {
          baseQuery.propertyType = { $in: allowedTypes.map((t: string) => strictValueRegex(t)) };
        }
      }
    }

    const now = new Date();
    const oneMonthFromNow = new Date();
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

    const [availableCount, notAvailableCount, upcomingCount] = await Promise.all([
      unregisteredOwner.countDocuments({ ...baseQuery, availability: "Available" }),
      unregisteredOwner.countDocuments({ ...baseQuery, availability: "Not Available" }),
      unregisteredOwner.countDocuments({
        ...baseQuery,
        availability: "Not Available",
        unavailableUntil: { $gte: now, $lte: oneMonthFromNow },
      }),
    ]);

    return NextResponse.json({ availableCount, notAvailableCount, upcomingCount });
  } catch (error) {
    console.error("getCounts error:", error);
    return NextResponse.json({ error: "Failed to fetch counts" }, { status: 500 });
  }
}
