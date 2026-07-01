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
import { batchComputeWhatsAppReplyStatus } from "@/lib/whatsapp/replyStatusResolver";
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
import { LeadQueryService } from "@/lib/leads/LeadQueryService";
import {
  applyQuickPropertyFiltersToQuery,
} from "@/util/leadFilterUtils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  const assignedArea = token.allotedArea as String[];
  const role = token.role;
  const employeeId = String((token as { id?: string })?.id || "");
  const employeeContext = await loadEmployeeLeadContext(
    employeeId,
    token.rentalType,
  );

  try {
    // console.log("req body in filter route: ", assignedArea, reqBody);
    const {
      searchType,
      searchTerm,
      dateFilter,
      customDays,
      fromDate,
      toDate,
      sortBy,
      status,
      guest,
      noOfBeds,
      propertyType,
      billStatus,
      budgetFrom,
      budgetTo,
      leadQuality,
      allotedArea,
      typeOfProperty,
      quickPropertyFilters,
    } = reqBody.filters;
    const hasQuickPropertyFilters =
      Array.isArray(quickPropertyFilters) && quickPropertyFilters.length > 0;
    // console.log("req body in filter route: ", reqBody);
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
        query.phoneNo = { $regex: searchTerm, $options: "i" };
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

    {
      /* Searching in non rejected Leads and leads with no reminders */
    }
    query = {
      ...query,
      ...dateQuery,
      // $and: [
      //   {
      //     $or: [
      //       {
      //         rejectionReason: { $exists: false },
      //       }, // rejectionReason field does not exist
      //       {
      //         rejectionReason: { $eq: null },
      //       }, // rejectionReason field exists but is an empty string
      //     ],
      //   },
      //   {
      //     $or: [
      //       { reminder: { $exists: false } }, // reminder field does not exist
      //       { reminder: { $eq: null } }, // reminder field exists but is an empty string
      //     ],
      //   },
      //   { leadStatus: "goodtogo" }, // all leads should be having goodtogo status
      // ],
      leadStatus: "active",
    };

    {
      /* Only search leads for alloted area, but only in case of agents not for TL and SuperAdmin */
    }
    // console.log("alloted area: ", allotedArea);
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
      includeWordsCount: true,
    });

    const statusPriorityMap: Record<string, number> = {
      None: 0,
      First: 1,
      Second: 2,
      Third: 3,
      Fourth: 4,
      Options: 5,
      Visit: 6,
    };

    if (status && status !== "None") {
      result.data.sort((a, b) => {
        const statusA =
          statusPriorityMap[String(a.messageStatus ?? "None")] ?? 0;
        const statusB =
          statusPriorityMap[String(b.messageStatus ?? "None")] ?? 0;
        return status === "Default" ? statusA - statusB : statusB - statusA;
      });
    }

    let statusMap = new Map<string, string | null>();
    try {
      const phoneNumbers = result.data
        .map((q) => String(q.phoneNo || ""))
        .filter(Boolean);
      statusMap = await batchComputeWhatsAppReplyStatus(phoneNumbers);
    } catch (replyErr) {
      console.warn(
        "WhatsApp reply status computation failed, returning leads without it:",
        replyErr,
      );
    }

    const data = result.data.map((q) => ({
      ...q,
      whatsappReplyStatus: statusMap.get(String(q.phoneNo || "")) || null,
    }));

    return NextResponse.json({
      ...result,
      data,
    });
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json(
        { success: false, code: error.code },
        { status: 401 },
      );
    }
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
