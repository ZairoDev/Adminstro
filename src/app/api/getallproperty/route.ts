// import { NextRequest, NextResponse } from "next/server";
// import { Property } from "@/models/listing";
// import { connectDb } from "@/util/db";
// connectDb();

// export async function GET(request: NextRequest): Promise<NextResponse> {
//   try {
//     const url = request.nextUrl;
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

//     const projection = {
//       isLive: 1,
//       hostedFrom: 1,
//       hostedBy: 1,
//       propertyCoverFileUrl: 1,
//       VSID: 1,
//       basePrice: 1,
//       _id: 1,
//     };
//     let allProperties;
//     if (!searchTerm) {
//       allProperties = await Property.find({}, projection)
//         .skip(skip)
//         .limit(limit)
//         .sort({ _id: -1 });
//     } else {
//       allProperties = await Property.find(query, projection).sort({ _id: -1 });
//     }
//     if (allProperties.length === 0) {
//       const totalCount = await Property.countDocuments();
//       console.log("Total properties in database:", totalCount);
//     }
//     const totalProperties = await Property.countDocuments(query);
//     const totalPages = Math.ceil(totalProperties / limit);
//     return NextResponse.json({
//       data: allProperties,
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
import { Property } from "@/models/listing";
import { connectDb } from "@/util/db";

// Add these lines to handle dynamic rendering
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    await connectDb(); // Ensure database connection is awaited

    // Safely extract search parameters
    const searchParams = request.nextUrl.searchParams;
    const page = Number(searchParams.get("page") || "1");
    const limit = Number(searchParams.get("limit") || "12");
    const skip = (page - 1) * limit;
    const searchTerm = searchParams.get("searchTerm") || "";
    const searchType = searchParams.get("searchType") || "VSID";

    const regex = new RegExp(searchTerm, "i");
    let query: Record<string, any> = {};

    if (searchTerm) {
      query[searchType] = regex;
    }

    const projection = {
      isLive: 1,
      hostedFrom: 1,
      hostedBy: 1,
      propertyCoverFileUrl: 1,
      VSID: 1,
      basePrice: 1,
      _id: 1,
    };

    let allProperties;
    if (!searchTerm) {
      allProperties = await Property.find({}, projection)
        .skip(skip)
        .limit(limit)
        .sort({ _id: -1 });
    } else {
      allProperties = await Property.find(query, projection).sort({ _id: -1 });
    }

    if (allProperties.length === 0) {
      const totalCount = await Property.countDocuments();
      console.log("Total properties in database:", totalCount);
    }

    const totalProperties = await Property.countDocuments(query);
    const totalPages = Math.ceil(totalProperties / limit);

    return NextResponse.json({
      data: allProperties,
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
