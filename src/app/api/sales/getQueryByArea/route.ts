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
import { getDataFromToken } from "@/util/getDataFromToken";
import { IQuery } from "@/util/type";

connectDb();
export const dynamic = "force-dynamic";

function convertToIST(date: Date): Date {
  return addHours(date, 5.5);
}

function getISTStartOfDay(date: Date): Date {
  const istDate = convertToIST(date);
  return setMilliseconds(setSeconds(setMinutes(setHours(istDate, 0), 0), 0), 0);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const token = await getDataFromToken(request);
    // console.log("token: ", token);
    const assignedArea = token.allotedArea;
    // console.log("assignedArea", assignedArea);

    const url = request.nextUrl;
    const page = Number(url.searchParams.get("page")) || 1;
    const limit = Number(url.searchParams.get("limit")) || 50;
    const skip = (page - 1) * limit;
    const searchTerm = url.searchParams.get("searchTerm") || "";
    const searchType = url.searchParams.get("searchType") || "name";
    const dateFilter = url.searchParams.get("dateFilter") || "";
    const sortingField = url.searchParams.get("sortingField") || "";
    const customDays = Number(url.searchParams.get("customDays")) || 0;
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const allotedArea = url.searchParams.get("allotedArea") || assignedArea;

    const regex = new RegExp(searchTerm, "i");
    let query: Record<string, any> = {};

    query = {
      $or: [
        { reminder: { $exists: false } }, // reminder field does not exist
        { reminder: { $eq: null } }, // reminder field exists but is an empty string
      ],
    };

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

    query = { ...query, rejectionReason: null, ...dateQuery };
    if (allotedArea) {
      if (Array.isArray(allotedArea)) {
        query.location = { $in: allotedArea };
      } else {
        query.location = allotedArea;
      }
    }

    // Perform the query
    const allquery = await Query.aggregate([
      { $match: query },
      { $sort: { updatedAt: -1 } }, // last updated lead will come first
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
