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
import Employees from "@/models/employee";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import {
  applyEffectiveRangeToQuery,
  computeEffectiveRange,
  loadEmployeePricingRules,
  applyPricingRulesByLocationToQuery,
} from "@/util/pricingRule";
import {
  applyPropertyVisibilityRuleToLeadQuery,
  loadEmployeePropertyVisibilityRules,
  applyPropertyVisibilityRulesByLocationToLeadQuery,
} from "@/util/propertyVisibilityRule";

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
  const employeeId = String((token as any)?.id || "");
  const employeePricingRules = await loadEmployeePricingRules(employeeId);
  const employeeVisibilityRules = await loadEmployeePropertyVisibilityRules(employeeId);
  const employeeLocationBlock = await Employees.findById(employeeId)
    .select("guestLeadLocationBlock")
    .lean();

  try {
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
    } = reqBody.filters;
    const PAGE = reqBody.page;

    const LIMIT = 50;
    const SKIP = (PAGE - 1) * LIMIT;

    const regex = new RegExp(searchTerm, "i");
    let query: Record<string, any> = {};

    if (searchTerm) {
      if (searchType === "phoneNo") {
         const cleanedPhone = searchTerm.replace(/\D/g, ''); // Remove all non-digit characters
         query.phoneNo = { $regex: cleanedPhone, $options: 'i' };
      } else {
        query[searchType] = regex;
      }
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

    if (guest) query.guest = { $gte: parseInt(guest, 10) };
    if (noOfBeds) query.noOfBeds = { $gte: parseInt(noOfBeds, 10) };
    let effectiveLocations: string[] | null = (() => {
      if (allotedArea && String(allotedArea).trim() !== "") return [String(allotedArea)];
      if (role !== "SuperAdmin" && role !== "Sales-TeamLead") {
        return Array.isArray(assignedArea) ? (assignedArea as any[]).map(String) : [String(assignedArea)];
      }
      return null;
    })();

    const blocked = new Set(
      Array.isArray((employeeLocationBlock as any)?.guestLeadLocationBlock?.all)
        ? ((employeeLocationBlock as any).guestLeadLocationBlock.all as any[]).map(String)
        : [],
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
        rules: employeeVisibilityRules,
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
        pricingRules: employeePricingRules,
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

    // Closed leads should have leadStatus: "closed"
    query = {
      ...query,
      ...dateQuery,
      leadStatus: "closed",
    };

    if (allotedArea) {
      query.location = new RegExp(allotedArea, "i");
    } else {
      if (role !== "SuperAdmin" && role !== "Sales-TeamLead") {
        if (Array.isArray(assignedArea)) {
          query.location = { $in: assignedArea };
        } else {
          query.location = assignedArea;
        }
      }
    }

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

    const allquery = await Query.aggregate([
      { $match: query },
      { $sort: { updatedAt: -1 } },
      { $skip: SKIP },
      { $limit: LIMIT },
      {
        $addFields: {
          istCreatedAt: {
            $dateToString: {
              date: { $add: ["$createdAt", 5.5 * 60 * 60 * 1000] },
              format: "%Y-%m-%d %H:%M:%S",
              timezone: "UTC",
            },
          },
        },
      },
    ]);

    const priorityMap = {
      None: 1,
      Low: 2,
      High: 3,
    };
    if (sortBy && sortBy !== "None") {
      allquery.sort((a, b) => {
        const priorityA =
          priorityMap[(a.salesPriority as keyof typeof priorityMap) || "None"];
        const priorityB =
          priorityMap[(b.salesPriority as keyof typeof priorityMap) || "None"];

        if (sortBy === "Asc") {
          return priorityA - priorityB;
        } else {
          return priorityB - priorityA;
        }
      });
    }

    const totalQueries = await Query.countDocuments(query);
    const totalPages = Math.ceil(totalQueries / LIMIT);

    return NextResponse.json({
      data: allquery,
      PAGE,
      totalPages,
      totalQueries,
    });
  } catch (error: any) {
    console.log("error in getting closed leads: ", error);
    return NextResponse.json(
      {
        message: "Failed to fetch closed leads from the database",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

