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
  const assignedArea = token.allotedArea;
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
    } = reqBody.filters;
    console.log("req body in filter route: ", reqBody);
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
    if (noOfBeds) query.noOfBeds = { $gte: parseInt(noOfBeds, 10) };
    if (propertyType) query.propertyType = propertyType;
    if (billStatus) query.billStatus = billStatus;
    if (budgetFrom) query.minBudget = { $gte: parseInt(budgetFrom, 10) };
    if (budgetTo) query.maxBudget = { $lte: parseInt(budgetTo, 10) };
    if (leadQuality) query.leadQualityByReviewer = leadQuality;

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

    const pipeline = [
      {
        $match: {
          leadStatus: "active",
        },
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
                    { $eq: ["$noOfBeds", 1] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          "2bhk": {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$typeOfProperty", "Apartment"] },
                    { $eq: ["$noOfBeds", 2] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          "3bhk": {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$typeOfProperty", "Apartment"] },
                    { $eq: ["$noOfBeds", 3] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          "4bhk": {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$typeOfProperty", "Apartment"] },
                    { $eq: ["$noOfBeds", 4] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          studio: {
            $sum: {
              $cond: [{ $eq: ["$typeOfProperty", "Studio"] }, 1, 0],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          "1bhk": 1,
          "2bhk": 1,
          "3bhk": 1,
          "4bhk": 1,
          studio: 1,
        },
      },
    ];

    const wordsCount = await Query.aggregate(pipeline);


    const totalQueries = await Query.countDocuments(query);
    const totalPages = Math.ceil(totalQueries / LIMIT);

    return NextResponse.json({
      data: allquery,
      PAGE,
      totalPages,
      totalQueries,
      wordsCount,
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
