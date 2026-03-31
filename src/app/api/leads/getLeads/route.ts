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
import { applyPricingRulesByLocationToQuery, loadEmployeePricingRules } from "@/util/pricingRule";
import {
  applyPropertyVisibilityRulesByLocationToLeadQuery,
  loadEmployeePropertyVisibilityRules,
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
  try {
    const token = await getDataFromToken(req);
    const reqBody = await req.json();
    const assignedArea = token.allotedArea as String[];
    const role = token.role;
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
      typeOfProperty,
      leadQualityByTeamLead
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
   
    if(noOfBeds){
      if(noOfBeds==="0"){
          query.noOfBeds = { $gte: parseInt(noOfBeds, 10) };
      }
      else{
        query.noOfBeds = parseInt(noOfBeds, 10);
      }

    }
    // propertyType is enforced later (intersection with employee rule)
    if (billStatus) query.billStatus = billStatus;

    // Determine effective locations list for location-scoped rules.
    // If a specific location filter is provided, scope to that.
    // Otherwise for non-exempt roles, scope to assigned areas.
    let effectiveLocations: string[] | null = (() => {
      if (allotedArea && String(allotedArea).trim() !== "") return [String(allotedArea)];
      if (role !== "SuperAdmin" && role !== "Sales-TeamLead" && role !== "LeadGen-TeamLead" && role !== "Advert") {
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
          wordsCount: [],
        });
      }
      effectiveLocations = filtered;
    }

    // Enforce property visibility rule (location-scoped)
    {
      const { impossible } = applyPropertyVisibilityRulesByLocationToLeadQuery({
        query,
        rules: employeeVisibilityRules,
        locations: effectiveLocations,
        uiPropertyType: propertyType,
        uiTypeOfProperty: typeOfProperty,
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

    // Enforce pricing rule (location-scoped)
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
    
    if (allotedArea) {
      query.location = new RegExp(allotedArea, "i");
    } else {
      if (role !== "SuperAdmin" && role !== "Sales-TeamLead" && role !== "LeadGen-TeamLead" && role !== "Advert") {
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

    // console.log("query after leadQualityByTeamLead: ", query);

    // console.log("created query: ", query);

    const allquery = await Query.aggregate([
      { $match: query },
      { $sort: { updatedAt: -1 } }, // last updated lead will come first
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
      None: 0,
      Medium : 1,
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
    
  const pipeline = [
  {
    $match: {
      leadStatus: "fresh",   
      ...(allotedArea
      ? { location: new RegExp(allotedArea, "i") }  
      : (assignedArea && assignedArea.length > 0
          ? { location: { $in: assignedArea } }  
          : {})),
    }
  },
  {
    $group: {
      _id: null,
      "1bhk": {
        $sum: {
          $cond: [
            { 
              $and: [
                { $eq: ["$typeOfProperty", "Apartment"] }, 
                { $eq: ["$noOfBeds", 1] }
              ] 
            },
            1,
            0
          ]
        }
      },
      "2bhk": {
        $sum: {
          $cond: [
            { 
              $and: [
                { $eq: ["$typeOfProperty", "Apartment"] }, 
                { $eq: ["$noOfBeds", 2] }
              ] 
            },
            1,
            0
          ]
        }
      },
      "3bhk": {
        $sum: {
          $cond: [
            { 
              $and: [
                { $eq: ["$typeOfProperty", "Apartment"] }, 
                { $eq: ["$noOfBeds", 3] }
              ] 
            },
            1,
            0
          ]
        }
      },
      "4bhk": {
        $sum: {
          $cond: [
            { 
              $and: [
                { $eq: ["$typeOfProperty", "Apartment"] }, 
                { $eq: ["$noOfBeds", 4] }
              ] 
            },
            1,
            0
          ]
        }
      },
      studio: {
        $sum: {
          $cond: [
            { $in: ["$typeOfProperty", ["Studio", "Studio / 1 bedroom"]] },
            1,
            0
          ]
        }
      },
      sharedApartment: {
        $sum: {
          $cond: [
            { $eq: ["$typeOfProperty", "Shared Apartment"] },
            1,
            0
          ]
        }
      }
    }
  },
  {
    $project: {
      _id: 0,
      "1bhk": 1,
      "2bhk": 1,
      "3bhk": 1,
      "4bhk": 1,
      studio: 1,
      sharedApartment: 1
    }
  }
]


   const statusPipeline = [
  {
    "$group": {
      "_id": "$messageStatus",
      "count": { "$sum": 1 }
    }
  },
  {
    "$group": {
      "_id": null,
      "First":   { "$sum": { "$cond": [{ "$eq": ["$_id", "First"] }, "$count", 0] } },
      "Second":  { "$sum": { "$cond": [{ "$eq": ["$_id", "Second"] }, "$count", 0] } },
      "Third":   { "$sum": { "$cond": [{ "$eq": ["$_id", "Third"] }, "$count", 0] } },
      "Fourth":  { "$sum": { "$cond": [{ "$eq": ["$_id", "Fourth"] }, "$count", 0] } },
      "Options": { "$sum": { "$cond": [{ "$eq": ["$_id", "Options"] }, "$count", 0] } },
      "Visit":   { "$sum": { "$cond": [{ "$eq": ["$_id", "Visit"] }, "$count", 0] } },
      "None":    { "$sum": { "$cond": [{ "$eq": ["$_id", "None"] }, "$count", 0] } },
      "Null":    { "$sum": { "$cond": [{ "$eq": ["$_id", null] }, "$count", 0] } }
    }
  },
  {
    "$project": { "_id": 0 }
  }
]

  const statusCount= await Query.aggregate(statusPipeline);
    // console.log("statusCount: ", statusCount);


    const wordsCount = await Query.aggregate(pipeline);
    //  console.log("wordsCount: ", wordsCount);

    const totalQueries = await Query.countDocuments(query);
    const totalPages = Math.ceil(totalQueries / LIMIT);

    return NextResponse.json({
      data: allquery,
      PAGE,
      totalPages,
      totalQueries,
      wordsCount,
      statusCount

    });
    
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