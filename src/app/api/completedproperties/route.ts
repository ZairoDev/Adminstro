// import { NextRequest, NextResponse } from "next/server";
// import { Property } from "@/models/listing";
// import { connectDb } from "@/util/db";
// import { getDataFromToken } from "@/util/getDataFromToken";
// import Employees from "@/models/employee";

// connectDb();

// export async function GET(request: NextRequest) {
//   try {
//     const url = request.nextUrl;
//     const page = Number(url.searchParams.get("page")) || 1;
//     const limit = Number(url.searchParams.get("limit")) || 12;
//     const skip = (page - 1) * limit;
//     const searchTerm = url.searchParams.get("searchTerm") || "";
//     const searchType = url.searchParams.get("searchType") || "VSID";

//     let wordsCount = 0;

//     const { email } = await getDataFromToken(request);
//     const employee = await Employees.findOne({ email });

//     if (employee && employee.role === "Content") {
//       wordsCount = employee.extras.get("wordsCount") || 0;
//     }

//     const regex = new RegExp(searchTerm, "i");
//     let query: Record<string, any> = {};
//     if (searchTerm) {
//       query[searchType] = regex;
//     }

//     query["newReviews"] = { $exists: true, $ne: "" };

//     const projection = {
//       isLive: 1,
//       propertyCoverFileUrl: 1,
//       VSID: 1,
//       basePrice: 1,
//       _id: 1,
//     };

//     let allProperties;

//     if (!searchTerm) {
//       allProperties = await Property.find(query, projection)
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

//     const completedProperties = await Property.countDocuments(query);
//     const totalPages = Math.ceil(completedProperties / limit);

//     const propertiesWithDescriptionsCount = await Property.countDocuments({
//       newReviews: { $exists: true, $ne: "" },
//     });

//     const totalCount = await Property.countDocuments();

//     return NextResponse.json({
//       data: allProperties,
//       page,
//       totalPages,
//       completedProperties,
//       propertiesWithDescriptionsCount,
//       wordsCount,
//       totalProperties: totalCount,
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
import { getDataFromToken } from "@/util/getDataFromToken";
import Employees from "@/models/employee";

export const dynamic = "force-dynamic"; // Added to resolve dynamic rendering issues

export async function GET(request: NextRequest) {
  try {
    await connectDb(); // Ensure db connection is awaited

    const url = request.nextUrl;
    const page = Number(url.searchParams.get("page")) || 1;
    const limit = Number(url.searchParams.get("limit")) || 12;
    const skip = (page - 1) * limit;
    const searchTerm = url.searchParams.get("searchTerm") || "";
    const searchType = url.searchParams.get("searchType") || "VSID";

    let wordsCount = 0;

    const { email } = await getDataFromToken(request);
    const employee = await Employees.findOne({ email });

    if (employee && employee.role === "Content") {
      wordsCount = employee.extras.get("wordsCount") || 0;
    }

    const regex = new RegExp(searchTerm, "i");
    let query: Record<string, any> = {};
    if (searchTerm) {
      query[searchType] = regex;
    }

    query["newReviews"] = { $exists: true, $ne: "" };

    const projection = {
      isLive: 1,
      propertyCoverFileUrl: 1,
      VSID: 1,
      basePrice: 1,
      _id: 1,
    };

    let allProperties;

    if (!searchTerm) {
      allProperties = await Property.find(query, projection)
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

    const completedProperties = await Property.countDocuments(query);
    const totalPages = Math.ceil(completedProperties / limit);

    const propertiesWithDescriptionsCount = await Property.countDocuments({
      newReviews: { $exists: true, $ne: "" },
    });

    const totalCount = await Property.countDocuments();

    return NextResponse.json({
      data: allProperties,
      page,
      totalPages,
      completedProperties,
      propertiesWithDescriptionsCount,
      wordsCount,
      totalProperties: totalCount,
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
