import { NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { Boosters } from "@/models/propertyBooster";

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
export async function GET() {
  try {
    await connectDb();

    // Fetch all properties
    const properties = await Boosters.find({}).lean();

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
