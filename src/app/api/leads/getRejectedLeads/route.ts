import {
  addHours,
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds,
  subDays,
} from "date-fns";
import { NextRequest, NextResponse } from "next/server";

import Query from "@/models/query";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { applyEmployeeRentalTypeLeadFilter } from "@/lib/enforceEmployeeRentalType";
import { LeadQueryService } from "@/lib/leads/LeadQueryService";
import {
  getBlockedLeadLocations,
  loadEmployeeLeadContext,
} from "@/lib/leads/employeeLeadContext";
import { applyPricingRulesByLocationToQuery } from "@/util/pricingRule";
import {
  applyPropertyVisibilityRulesByLocationToLeadQuery,
} from "@/util/propertyVisibilityRule";
import {
  applyGuestLeadLocationToQuery,
  resolveEffectiveLeadLocations,
} from "@/util/guestLeadLocationScope";

connectDb();

function convertToIST(date: Date): Date {
  return addHours(date, 5.5);
}
function getISTStartOfDay(date: Date): Date {
  const istDate = convertToIST(date);
  return setMilliseconds(setSeconds(setMinutes(setHours(istDate, 0), 0), 0), 0);
}

export async function POST(req: NextRequest) {
  const reqBody = await req.json();
  const token = await getDataFromToken(req);
  const assignedArea = token.allotedArea;
  const role = token.role;

  try {
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
      rejectionReason,
    } = reqBody.filters;
    const PAGE = reqBody.page;

    const LIMIT = 50;
    const SKIP = (PAGE - 1) * LIMIT;

    const regex = new RegExp(searchTerm, "i");
    let query: Record<string, any> = {};

    {
      /* Search Term */
    }
    if (searchTerm) {
      if (searchType === "phoneNo") {
         const cleanedPhone = searchTerm.replace(/\D/g, ''); // Remove all non-digit characters
  query.phoneNo = { $regex: cleanedPhone, $options: 'i' };
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
    if (noOfBeds) query.noOfBeds = { $gte: parseInt(noOfBeds, 10) };
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
        });
      }
      effectiveLocations = filtered;
    }

    {
      const { impossible } = applyPropertyVisibilityRulesByLocationToLeadQuery({
        query,
        rules: employeeContext.propertyVisibilityRules,
        locations: effectiveLocations,
        uiPropertyType: propertyType,
      });
      if (impossible) {
        return NextResponse.json({
          data: [],
          totalPages: 1,
          totalQueries: 0,
        });
      }
    }
    if (billStatus) query.billStatus = billStatus;
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
        });
      }
    }
    if (leadQuality) query.leadQualityByReviewer = leadQuality;
    if (rejectionReason) query.rejectionReason = rejectionReason;
    {
      /* Searching in non rejected Leads and leads with no reminders */
    }
    query = {
      ...query,
      ...dateQuery,
      // $and: [
      //   {
      //     $and: [
      //       {
      //         rejectionReason: { $exists: true },
      //       }, // rejectionReason field should exist and should not be null
      //       {
      //         rejectionReason: { $ne: null },
      //       }, // rejectionReason field exists and not equal to null
      //     ],
      //   },
      //   {
      //     $or: [
      //       { reminder: { $exists: false } }, // reminder field does not exist
      //       { reminder: { $eq: null } }, // reminder field exists but is an empty string
      //     ],
      //   },
      //   { leadStatus: { $exists: false } }, // the leads should not have any status
      // ],
      leadStatus: "rejected",
    };

    {
      /* Only search leads for alloted area */
    }
    applyGuestLeadLocationToQuery(query, {
      role: String(role ?? ""),
      assignedArea,
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
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.log("error in getting filtered leads: ", error);
    return NextResponse.json(
      {
        message: "Failed to fetch properties from the database",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
