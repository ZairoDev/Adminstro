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
    const assignedArea = token.allotedArea;

    const url = request.nextUrl;
    const page = Number(url.searchParams.get("page")) || 1;
    const limit = Number(url.searchParams.get("limit")) || 12;
    const skip = (page - 1) * limit;
    const searchTerm = url.searchParams.get("searchTerm") || "";
    const searchType = url.searchParams.get("searchType") || "name";
    const dateFilter = url.searchParams.get("dateFilter") || "";
    const customDays = Number(url.searchParams.get("customDays")) || 0;
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const allotedArea = url.searchParams.get("allotedArea") || assignedArea;

    const regex = new RegExp(searchTerm, "i");
    let query: Record<string, any> = {};

    if (searchTerm) {
      if (searchType === "phoneNo") {
        query.phoneNo = searchTerm;
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
      query.location = allotedArea;
    }

    // Perform the query
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
