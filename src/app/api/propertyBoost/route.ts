import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { Boosters } from "@/models/propertyBooster";
import { getDataFromToken } from "@/util/getDataFromToken";
import { applyLocationFilter, isLocationExempt } from "@/util/apiSecurity";

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

    // Build query with location filtering
    const query: Record<string, any> = {};

    // Apply location filtering for Sales users (non-exempt roles)
    if (!isLocationExempt(role)) {
      const locationStr = location && typeof location === "string" ? location : undefined;
      applyLocationFilter(query, role, assignedArea, locationStr);
    } else if (location && typeof location === "string" && location !== "All") {
      // For exempt roles, allow location filtering if requested
      query.location = new RegExp(location, "i");
    }

    // Fetch properties with location filter applied
    const properties = await Boosters.find(query).lean();

    // Sort by most recent activity (lastReboostedAt or createdAt)
    const sortedProperties = properties.sort((a, b) => {
      const aDate = a.lastReboostedAt 
        ? new Date(a.lastReboostedAt).getTime() 
        : new Date(a.createdAt).getTime();
      
      const bDate = b.lastReboostedAt 
        ? new Date(b.lastReboostedAt).getTime() 
        : new Date(b.createdAt).getTime();
      
      return bDate - aDate;
    });

    return NextResponse.json(sortedProperties);
  } catch (error: any) {
    console.error("Error fetching properties:", error);
    return NextResponse.json(
      { error: "Failed to fetch properties" },
      { status: 500 }
    );
  }
}
