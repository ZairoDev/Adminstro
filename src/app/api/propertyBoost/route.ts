import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { Boosters } from "@/models/propertyBooster";
import { getDataFromToken } from "@/util/getDataFromToken";
import { applyLocationFilter, isLocationExempt } from "@/util/apiSecurity";

export const dynamic = "force-dynamic";

// POST: Create a new property
export async function POST(req: Request) {
  try {
    await connectDb();
    const body = await req.json();

    const { title,location, description,ownerName,ownerPhone, images, createdBy, vsid} = body;

    if (!title ||!location|| !description ||!ownerName||!ownerPhone||  !images?.length) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const property = await Boosters.create({
      title,
      location,
      ownerName,
      vsid,
      ownerPhone,
      description,
      images,
      createdBy,
    });

    return NextResponse.json(property, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// GET: Fetch all properties
export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl;
    const pageParam = Number(url.searchParams.get("page"));
    const skipParam = Number(url.searchParams.get("skip"));
    const limitParam = Number(url.searchParams.get("limit"));
    const createdBy = url.searchParams.get("createdBy");
    const dateFromParam = url.searchParams.get("dateFrom");
    const dateToParam = url.searchParams.get("dateTo");
    let dateQuery: { $gte: Date; $lte: Date } | undefined;
    if (dateFromParam && dateToParam) {
      const fromDate = new Date(dateFromParam);
      const toDate = new Date(dateToParam);
      if (!Number.isNaN(fromDate.getTime()) && !Number.isNaN(toDate.getTime())) {
        fromDate.setHours(0, 0, 0, 0);
        toDate.setHours(23, 59, 59, 999);
        dateQuery = {
          $gte: fromDate,
          $lte: toDate,
        };
      }
    } 
    const limit =
      Number.isFinite(limitParam) && limitParam > 0
        ? Math.min(limitParam, 100)
        : 10;
    const page =
      Number.isFinite(pageParam) && pageParam > 0
        ? Math.floor(pageParam)
        : Number.isFinite(skipParam) && skipParam >= 0
        ? Math.floor(skipParam / limit) + 1
        : 1;
    const skip = (page - 1) * limit;
    const sort = url.searchParams.get("sort") || "-lastReboostedAt";

    await connectDb();

    // Get user token for authorization
    const token = await getDataFromToken(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role: string = (token.role || "") as string;
    const assignedArea: string | string[] | undefined = 
      token.allotedArea 
        ? (Array.isArray(token.allotedArea) 
            ? token.allotedArea 
            : typeof token.allotedArea === "string" 
            ? token.allotedArea 
            : undefined)
        : undefined;
    const location = req.nextUrl.searchParams.get("location");
    // console.log("location", location,assignedArea,role);

    // Build query with location filtering
    const query: Record<string, unknown> = {};

    // Apply location filtering for Sales users (non-exempt roles)
    // LeadGen and LeadGen-TeamLead are exempt and should see ALL properties (including reboosted)
    if (!isLocationExempt(role)) {
      const locationStr = location && typeof location === "string" ? location : undefined;
      applyLocationFilter(query, role, assignedArea, locationStr);
    } else if (location && typeof location === "string" && location !== "All") {
      // For exempt roles, allow location filtering if requested
      query.location = new RegExp(location, "i");
    }
    if (createdBy && typeof createdBy === "string" && createdBy !== "All") {
      query.createdBy = createdBy;
    }
    if (dateQuery) {
      query.createdAt = dateQuery;
    }

    // Fetch properties with location filter applied


    const [properties, totalProperties] = await Promise.all([
      Boosters.find(query).lean().skip(skip).limit(limit).sort(sort),
      Boosters.countDocuments(query),
    ]);
    const totalPages = Math.max(1, Math.ceil(totalProperties / limit));

    return NextResponse.json({
      data: properties,
      totalProperties,
      page,
      limit,
      totalPages,
      hasPrevPage: page > 1,
      hasNextPage: page < totalPages,
    });
  } catch (error: unknown) {
    console.error("Error fetching properties:", error);
    return NextResponse.json(
      { error: "Failed to fetch properties" },
      { status: 500 }
    );
  }
}
