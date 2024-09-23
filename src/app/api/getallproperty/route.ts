import { NextResponse } from "next/server";
import { Property } from "@/models/listing";
import { connectDb } from "@/util/db";

connectDb();
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page")) || 1;
    const limit = Number(url.searchParams.get("limit")) || 12;
    const skip = (page - 1) * limit;
    const searchTerm = url.searchParams.get("searchTerm") || "";
    const searchType = url.searchParams.get("searchType") || "VSID";

    const regex = new RegExp(searchTerm, "i");

    let query: Record<string, any> = {};

    if (searchTerm) {
      query[searchType] = regex;
    }
    let allProperties;

    if (!searchTerm) {
      allProperties = await Property.find()
        .skip(skip)
        .limit(limit)
        .sort({ _id: -1 });
    } else {
      allProperties = await Property.find(query).sort({ _id: -1 });
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
