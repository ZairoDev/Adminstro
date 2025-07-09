import { NextRequest, NextResponse } from "next/server";

import Query from "@/models/query";
import { connectDb } from "@/util/db";
import {
  subDays,
  addHours,
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds,
} from "date-fns";

connectDb();

function convertToIST(date: Date): Date {
  return addHours(date, 5.5);
}

function getISTStartOfDay(date: Date): Date {
  const istDate = convertToIST(date);
  return setMilliseconds(setSeconds(setMinutes(setHours(istDate, 0), 0), 0), 0);
}

export async function POST(request: NextRequest) {
  try {
    const {
      page,
      limit,
      searchTerm,
      searchType,
      dateFilter,
      sortingField,
      customDays,
      startDate,
      endDate,
      allocatedArea: allotedArea,
    } = await request.json();
    const skip = (page - 1) * limit;

    console.log(`data in reminder: page: ${page}, skip: ${skip}, searchTerm: ${searchTerm}, searchType: ${searchType},
    dateFilter: ${dateFilter}, sortingField: ${sortingField}, customDays: ${customDays}, allotedArea: ${allotedArea},
    limit: ${limit}, startDate: ${startDate}, endDate: ${endDate}`);

    const regex = new RegExp(searchTerm, "i");
    let query: Record<string, any> = {};

    query = {
      $or: [{ reminder: { $exists: true } }, { reminder: { $ne: null } }],
    };

    const temp = await Query.find(query);

    if (searchTerm) {
      if (searchType === "phoneNo") {
        query.phoneNo = Number(searchTerm);
      } else {
        query[searchType] = regex;
      }
    }

    // Add date filtering
    let dateQuery: any = {};
    const istToday = getISTStartOfDay(new Date());
    const istYesterday = getISTStartOfDay(subDays(new Date(), 1));
    switch (dateFilter) {
      case "today":
        dateQuery = {
          createdAt: {
            $gte: new Date(istToday.toISOString()),
            $lt: new Date(addHours(istToday, 24).toISOString()),
          },
        };
        break;
      case "yesterday":
        dateQuery = {
          createdAt: {
            $gte: new Date(istYesterday.toISOString()),
            $lt: new Date(istToday.toISOString()),
          },
        };
        break;
      case "lastDays":
        if (customDays > 0) {
          const pastDate = getISTStartOfDay(subDays(new Date(), customDays));
          dateQuery = {
            createdAt: {
              $gte: new Date(pastDate.toISOString()),
            },
          };
        }
        break;
      case "customRange":
        if (startDate && endDate) {
          const istStartDate = getISTStartOfDay(new Date(startDate));
          const istEndDate = getISTStartOfDay(addHours(new Date(endDate), 24));
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

    query = { ...query, rejectionReason: { $eq: null }, ...dateQuery };
    if (allotedArea) {
      query.location = allotedArea;
    }

    const allquery = await Query.aggregate([
      { $match: query },
      { $sort: { _id: -1 } },
      { $skip: skip },
      { $limit: limit },
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

    if (sortingField && sortingField !== "None") {
      allquery.sort((a, b) => {
        const priorityA =
          priorityMap[(a.salesPriority as keyof typeof priorityMap) || "None"];
        const priorityB =
          priorityMap[(b.salesPriority as keyof typeof priorityMap) || "None"];

        if (sortingField === "Asc") {
          return priorityA - priorityB;
        } else {
          return priorityB - priorityA;
        }
      });
    }

    const totalQueries = await Query.countDocuments(query);
    const totalPages = Math.ceil(totalQueries / limit);

    return NextResponse.json({
      data: allquery,
      page,
      totalPages,
      totalQueries,
    });
  } catch (error: any) {
    console.error("Error in GET request:", error);
    return NextResponse.json(
      {
        message: "Failed to fetch properties from the database",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
