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
  loadEmployeePricingRules,
  applyPricingRulesByLocationToQuery,
} from "@/util/pricingRule";
import {
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

  try {
    const employeeId = String((token as any)?.id || "");
    const employeePricingRules = await loadEmployeePricingRules(employeeId);
    const employeeVisibilityRules = await loadEmployeePropertyVisibilityRules(employeeId);
    const employeeLocationBlock = await Employees.findById(employeeId)
      .select("guestLeadLocationBlock")
      .lean();
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

    {
      /* Searching in non rejected Leads and leads with reminders set */
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
      //       { reminder: { $exists: true } }, // either reminder field should exist
      //       { reminder: { $ne: null } }, // or reminder field exists but is an empty string
      //     ],
      //   },
      //   { leadStatus: { $exists: false } }, // the leads should not have any status
      // ],
      leadStatus: "reminder",
    };

    {
      /* Only search leads for alloted area, but only in case of agents not for TL and SuperAdmin */
    }
    // console.log("alloted area: ", allotedArea);
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

    // console.log("created query: ", query);

    const allquery = await Query.aggregate([
      { $match: query },
      { $sort: { reminder: 1, updatedAt: -1 } }, // sort by reminder date (earliest first), then by last updated
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

    // console.log("all query length: ", allquery.length);

    {
      /*Sorting*/
    }
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
