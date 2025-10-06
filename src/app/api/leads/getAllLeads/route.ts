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
      guest,
      noOfBeds,
      propertyType,
      billStatus,
      budgetFrom,
      budgetTo,
      leadQuality,
      allotedArea,
      typeOfProperty,
      createdBy,
      salesPriority,
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
    if (propertyType) query.propertyType = propertyType;
    if (billStatus) query.billStatus = billStatus;
    if (budgetFrom) query.minBudget = { $gte: parseInt(budgetFrom, 10) };
    if (budgetTo) query.maxBudget = { $lte: parseInt(budgetTo, 10) };
    if (leadQuality) query.leadQualityByReviewer = leadQuality;
    if (typeOfProperty) query.typeOfProperty = typeOfProperty;


      if(role !== "SuperAdmin" && role !== "Sales-TeamLead" && role !== "LeadGen-TeamLead"){
        query.createdBy = token.email;
      }
      if(salesPriority) query.salesPriority = salesPriority;
    
    {
      /* Only search leads for alloted area, but only in case of agents not for TL and SuperAdmin */
    }
    
    // if (allotedArea) {
    //   query.location = new RegExp(allotedArea, "i");
    // } else {
    //   if (role !== "SuperAdmin" && role !== "Sales-TeamLead" && role !== "LeadGen-TeamLead") {
    //     if (Array.isArray(assignedArea)) {
    //       query.location = { $in: assignedArea };
    //     } else {
    //       query.location = assignedArea;
    //     }
    //   }
    // }

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