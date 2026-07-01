import {
  subDays,
  addHours,
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds,
} from "date-fns";
import { NextRequest, NextResponse } from "next/server";

import Query from "@/models/query";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { applyEmployeeRentalTypeLeadFilter } from "@/lib/enforceEmployeeRentalType";
import {
  getBlockedLeadLocations,
  loadEmployeeLeadContext,
} from "@/lib/leads/employeeLeadContext";
import { LeadQueryService } from "@/lib/leads/LeadQueryService";
import { applyPricingRulesByLocationToQuery } from "@/util/pricingRule";
import {
  applyPropertyVisibilityRulesByLocationToLeadQuery,
} from "@/util/propertyVisibilityRule";
import {
  applyGuestLeadLocationToQuery,
  resolveEffectiveLeadLocations,
} from "@/util/guestLeadLocationScope";
import {
  applyQuickPropertyFiltersToQuery,
} from "@/util/leadFilterUtils";

connectDb();

function convertToIST(date: Date): Date {
  return addHours(date, 5.5);
}
function getISTStartOfDay(date: Date): Date {
  const istDate = convertToIST(date);
  return setMilliseconds(setSeconds(setMinutes(setHours(istDate, 0), 0), 0), 0);
}

export async function POST(req: NextRequest) {
  try {
    const token = await getDataFromToken(req);
    const reqBody = await req.json();
    const assignedArea = token.allotedArea as String[];
    const role = token.role;
    const employeeId = String((token as { id?: string })?.id || "");
    const employeeContext = await loadEmployeeLeadContext(
      employeeId,
      token.rentalType,
    );
    // console.log("req body in filter route: ", assignedArea, reqBody);

    const {
      searchType,
      searchTerm,
      dateFilter,
      customDays,
      fromDate,
      toDate,
      sortBy,
      guest,
      noOfBeds,
      propertyType,
      billStatus,
      budgetFrom,
      budgetTo,
      leadQuality,
      allotedArea,
      typeOfProperty,
      leadQualityByTeamLead,
      quickPropertyFilters,
    } = reqBody.filters;
    const hasQuickPropertyFilters =
      Array.isArray(quickPropertyFilters) && quickPropertyFilters.length > 0;
    const PAGE = reqBody.page;

    const regex = new RegExp(searchTerm, "i");
    let query: Record<string, any> = {};

    {
      /* Search Term */
    }
    if (searchTerm) {
      if (searchType === "phoneNo") {
        // query.phoneNo = Number(searchTerm);
        query.phoneNo = new RegExp(String(searchTerm), "i");
      } else {
        query[searchType] = regex;
      }
    }

    {
      /* Date Filter */
    }
    let dateQuery: any = {};
    const istToday = getISTStartOfDay(new Date());
    const istYesterday = getISTStartOfDay(subDays(new Date(), 1));
    switch (dateFilter) {
      case "Today":
        dateQuery = {
          createdAt: {
            $gte: new Date(istToday.toISOString()),
            $lt: new Date(addHours(istToday, 24).toISOString()),
          },
        };
        break;
      case "Yesterday":
        dateQuery = {
          createdAt: {
            $gte: new Date(istYesterday.toISOString()),
            $lt: new Date(istToday.toISOString()),
          },
        };
        break;
      case "Last X Days":
        if (customDays > 0) {
          const pastDate = getISTStartOfDay(subDays(new Date(), customDays));
          dateQuery = {
            createdAt: {
              $gte: new Date(pastDate.toISOString()),
            },
          };
        }
        break;
      case "Custom Date Range":
        if (fromDate && toDate) {
          const istStartDate = getISTStartOfDay(new Date(fromDate));
          const istEndDate = getISTStartOfDay(addHours(new Date(toDate), 24));
          dateQuery = {
            createdAt: {
              $gte: new Date(istStartDate.toISOString()),
              $lt: new Date(istEndDate.toISOString()),
            },
          };
        }
        break;
      default:
        break;
    }

    // Other filters
    if (guest) query.guest = { $gte: parseInt(guest, 10) };
   
    if (!hasQuickPropertyFilters && noOfBeds) {
      if (noOfBeds === "0") {
        query.noOfBeds = { $gte: parseInt(noOfBeds, 10) };
      } else {
        query.noOfBeds = parseInt(noOfBeds, 10);
      }
    }
    // propertyType is enforced later (intersection with employee rule)
    if (billStatus) query.billStatus = billStatus;

    // Determine effective locations list for location-scoped rules.
    // If a specific location filter is provided, scope to that.
    // Otherwise for non-exempt roles, scope to assigned areas.
    let effectiveLocations = resolveEffectiveLeadLocations({
      role: String(role ?? ""),
      assignedArea,
      uiAllotedArea: allotedArea,
    });

    const blocked = getBlockedLeadLocations(
      employeeContext.guestLeadLocationBlock,
    );
    if (blocked.size && effectiveLocations && effectiveLocations.length) {
      const filtered = effectiveLocations.filter((l) => !blocked.has(String(l).toLowerCase()));
      if (filtered.length === 0) {
        return NextResponse.json({
          data: [],
          totalPages: 1,
          totalQueries: 0,
          wordsCount: [],
        });
      }
      effectiveLocations = filtered;
    }

    // Enforce property visibility rule (location-scoped)
    {
      const { impossible } = applyPropertyVisibilityRulesByLocationToLeadQuery({
        query,
        rules: employeeContext.propertyVisibilityRules,
        locations: effectiveLocations,
        uiPropertyType: propertyType,
        uiTypeOfProperty: hasQuickPropertyFilters ? "" : typeOfProperty,
      });
      if (impossible) {
        return NextResponse.json({
          data: [],
          totalPages: 1,
          totalQueries: 0,
          wordsCount: [],
        });
      }
    }

    if (hasQuickPropertyFilters) {
      applyQuickPropertyFiltersToQuery(query, quickPropertyFilters);
    }

    // Enforce pricing rule (location-scoped)
    {
      const { impossible } = applyPricingRulesByLocationToQuery({
        query,
        pricingRules: employeeContext.pricingRules,
        uiBudgetFrom: budgetFrom,
        uiBudgetTo: budgetTo,
        locations: effectiveLocations,
      });
      if (impossible) {
        return NextResponse.json({
          data: [],
          totalPages: 1,
          totalQueries: 0,
          wordsCount: [],
        });
      }
    }
    if (leadQuality) query.leadQualityByReviewer = leadQuality;
    // typeOfProperty is enforced later (intersection with employee rule)
    if (leadQualityByTeamLead){
      if (leadQualityByTeamLead === "Not Approved") {
        query.leadQualityByTeamLead = "Not Approved";
      }
      else{

      }
    } 


    {
      /* Searching in non rejected Leads and leads with no reminders */
    }
    query = {
      ...query,
      ...dateQuery,
      leadStatus: "fresh",
    };

    {
      /* Only search leads for alloted area, but only in case of agents not for TL and SuperAdmin */
    }
    
    applyGuestLeadLocationToQuery(query, {
      role: String(role ?? ""),
      assignedArea: effectiveLocations ?? assignedArea,
      uiAllotedArea: allotedArea,
    });

    // Enforce "hide guest leads by location" at the query level too
    if (blocked.size) {
      if (query.location instanceof RegExp) {
        const requested = String(allotedArea || "").trim().toLowerCase();
        if (requested && blocked.has(requested)) {
          query.location = { $in: [] };
        }
      } else if (typeof query.location === "string") {
        if (blocked.has(query.location.toLowerCase())) {
          query.location = { $in: [] };
        }
      } else if (query.location && typeof query.location === "object" && Array.isArray(query.location.$in)) {
        const filtered = (query.location.$in as any[])
          .map((x) => String(x))
          .filter((x) => !blocked.has(x.toLowerCase()));
        query.location = { $in: filtered };
      }
    }

    // console.log("query after leadQualityByTeamLead: ", query);

    // console.log("created query: ", query);

    query = await applyEmployeeRentalTypeLeadFilter(
      query,
      token,
      employeeContext.rentalType,
    );

    const result = await LeadQueryService.list({
      matchQuery: query,
      page: PAGE,
      sortBy,
      includeStatusCount: true,
      includeWordsCount: true,
    });

    return NextResponse.json(result);
    
  } catch (error: unknown) {
    const err = error as { status?: number; code?: string; message?: string };
    if (err?.status === 401 || err?.code) {
      return NextResponse.json(
        { code: err.code || "AUTH_FAILED" },
        { status: err.status || 401 }
      );
    }
    console.log("error in getting filtered leads: ", error);
    return NextResponse.json(
      {
        message: "Failed to fetch properties from the database",
        error: err?.message,
      },
      { status: 500 }
    );
  }
}