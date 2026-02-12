import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { Properties } from "@/models/property";
import { getDataFromToken } from "@/util/getDataFromToken";

export const dynamic = "force-dynamic";

connectDb();

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl;
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

    // HAdmin filter: only Short Term OR hostedFrom = "holidaysera"
    let isHAdmin = false;
    try {
      const payload: any = await getDataFromToken(request).catch(() => null);
      if (payload?.role === "HAdmin") {
        isHAdmin = true;
      }
    } catch (e) {
      // ignore token errors
    }

    if (isHAdmin) {
      const hadminFilter = {
        $or: [
          { rentalType: "Short Term" },
          { hostedFrom: { $regex: /holidaysera/i } },
        ],
      };
      if (Object.keys(query).length > 0) {
        query = { $and: [query, hadminFilter] };
      } else {
        query = hadminFilter;
      }
    }

    const projection = {
      isLive: 1,
      hostedFrom: 1,
      hostedBy: 1,
      rentalType: 1,
      propertyCoverFileUrl: 1,
      VSID: 1,
      propertyName: 1,
      city: 1,
      bedrooms: 1,
      bathrooms: 1,
      basePrice: 1,
      basePriceLongTerm: 1,
      commonId: 1,
      _id: 1,
    };

    let allProperties;
    if (!searchTerm && !isHAdmin) {
      allProperties = await Properties.find({}, projection)
        .skip(skip)
        .limit(limit)
        .sort({ _id: -1 });
    } else {
      allProperties = await Properties.find(query, projection)
        .skip(skip)
        .limit(limit)
        .sort({ _id: -1 });
    }

    const totalProperties = await Properties.countDocuments(
      !searchTerm && !isHAdmin ? {} : query
    );
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
