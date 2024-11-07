// import { NextRequest, NextResponse } from "next/server";

// import Query from "@/models/query";
// import { connectDb } from "@/util/db";
// connectDb();
// export async function GET(request: NextRequest): Promise<NextResponse> {
//   try {
//     const url = new URL(request.url);
//     const page = Number(url.searchParams.get("page")) || 1;
//     const limit = Number(url.searchParams.get("limit")) || 12;
//     const skip = (page - 1) * limit;
//     const searchTerm = url.searchParams.get("searchTerm") || "";
//     const searchType = url.searchParams.get("searchType") || "VSID";

//     const regex = new RegExp(searchTerm, "i");

//     let query: Record<string, any> = {};

//     if (searchTerm) {
//       query[searchType] = regex;
//     }
//     let allquery;

//     if (!searchTerm) {
//       allquery = await Query.find().skip(skip).limit(limit).sort({ _id: -1 });
//     } else {
//       allquery = await Query.find(query).sort({ _id: -1 });
//     }

//     if (allquery.length === 0) {
//       const totalCount = await Query.countDocuments();
//       console.log("Total properties in database:", totalCount);
//     }

//     const totalProperties = await Query.countDocuments(query);
//     const totalPages = Math.ceil(totalProperties / limit);

//     return NextResponse.json({
//       data: allquery,
//       page,
//       totalPages,
//       totalProperties,
//     });
//   } catch (error: any) {
//     console.error("Error in GET request:", error);
//     return NextResponse.json(
//       {
//         message: "Failed to fetch properties from the database",
//         error: error.message,
//       },
//       { status: 500 }
//     );
//   }
// }

// Till normal filter it is working fine

// import { NextRequest, NextResponse } from "next/server";
// import Query from "@/models/query";
// import { connectDb } from "@/util/db";
// import { startOfToday, startOfYesterday, subDays } from "date-fns";

// connectDb();

// export async function GET(request: NextRequest): Promise<NextResponse> {
//   try {
//     const url = new URL(request.url);
//     const page = Number(url.searchParams.get("page")) || 1;
//     const limit = Number(url.searchParams.get("limit")) || 12;
//     const skip = (page - 1) * limit;
//     const searchTerm = url.searchParams.get("searchTerm") || "";
//     const searchType = url.searchParams.get("searchType") || "Name";
//     const dateFilter = url.searchParams.get("dateFilter") || "all";
//     const customDays = Number(url.searchParams.get("customDays")) || 0;
//     const startDate = url.searchParams.get("startDate");
//     const endDate = url.searchParams.get("endDate");

//     const regex = new RegExp(searchTerm, "i");
//     let query: Record<string, any> = {};

//     if (searchTerm) {
//       query[searchType] = regex;
//     }

//     console.log(searchTerm, "SearchTerm will print here");

//     let dateQuery: any = {};
//     const today = startOfToday();
//     const yesterday = startOfYesterday();

//     switch (dateFilter) {
//       case "today":
//         dateQuery = { createdAt: { $gte: today } };
//         break;
//       case "yesterday":
//         dateQuery = { createdAt: { $gte: yesterday, $lt: today } };
//         break;
//       case "lastDays":
//         if (customDays > 0) {
//           const pastDate = subDays(today, customDays);
//           dateQuery = { createdAt: { $gte: pastDate } };
//         }
//         break;
//       case "customRange":
//         if (startDate && endDate) {
//           dateQuery = {
//             createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
//           };
//         }
//         break;
//       default:
//         break;
//     }
//     query = { ...query, ...dateQuery };
//     const allquery = await Query.find(query)
//       .skip(skip)
//       .limit(limit)
//       .sort({ _id: -1 });
//     const totalProperties = await Query.countDocuments(query);
//     const totalPages = Math.ceil(totalProperties / limit);

//     return NextResponse.json({
//       data: allquery,
//       page,
//       totalPages,
//       totalProperties,
//     });
//   } catch (error: any) {
//     console.error("Error in GET request:", error);
//     return NextResponse.json(
//       {
//         message: "Failed to fetch properties from the database",
//         error: error.message,
//       },
//       { status: 500 }
//     );
//   }
// }

import { NextRequest, NextResponse } from "next/server";
import Query from "@/models/query";
import { connectDb } from "@/util/db";
import { startOfToday, startOfYesterday, subDays } from "date-fns";

connectDb();

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page")) || 1;
    const limit = Number(url.searchParams.get("limit")) || 12;
    const skip = (page - 1) * limit;
    const searchTerm = url.searchParams.get("searchTerm") || "";
    const searchType = url.searchParams.get("searchType") || "name";
    const dateFilter = url.searchParams.get("dateFilter") || "";
    const customDays = Number(url.searchParams.get("customDays")) || 0;
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");

    // Define the regex for the search term (case-insensitive)
    const regex = new RegExp(searchTerm, "i");
    let query: Record<string, any> = {};

    // Conditionally add search criteria based on the searchType
    if (searchTerm) {
      if (searchType === "phoneNo") {
        query.phoneNo = searchTerm; // Exact match for phone numbers
      } else {
        query[searchType] = regex; // Partial match for name or email
      }
    }

    console.log("Constructed query:", query);
    console.log("Search Type:", searchType);

    // Define date filter criteria
    let dateQuery: any = {};
    const today = startOfToday();
    const yesterday = startOfYesterday();

    switch (dateFilter) {
      case "today":
        dateQuery = { createdAt: { $gte: today } };
        break;
      case "yesterday":
        dateQuery = { createdAt: { $gte: yesterday, $lt: today } };
        break;
      case "lastDays":
        if (customDays > 0) {
          const pastDate = subDays(today, customDays);
          dateQuery = { createdAt: { $gte: pastDate } };
        }
        break;
      case "customRange":
        if (startDate && endDate) {
          dateQuery = {
            createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
          };
        }
        break;
      default:
        break;
    }

    // Combine search criteria and date filter into a single query
    query = { ...query, ...dateQuery };

    // Fetch filtered results and pagination details
    const allquery = await Query.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ _id: -1 });

    const totalProperties = await Query.countDocuments(query);
    const totalPages = Math.ceil(totalProperties / limit);

    return NextResponse.json({
      data: allquery,
      page,
      totalPages,
      totalProperties,
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
