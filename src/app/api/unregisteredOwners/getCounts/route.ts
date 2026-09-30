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
import { applyOwnerSheetPropertyTypeFilter } from "@/util/propertyTypeAllowList";

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

    const propertyTypeResult = applyOwnerSheetPropertyTypeFilter({
      query: baseQuery,
      rules: (ownerRuleDoc as { ownerPropertyTypeVisibilityRules?: null })?.ownerPropertyTypeVisibilityRules,
      locations: effectiveLocationsForRules,
      propertyTypeFilter: filters?.propertyType,
    });
    if (propertyTypeResult.impossible) {
      return NextResponse.json({ availableCount: 0, notAvailableCount: 0, upcomingCount: 0 });
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
