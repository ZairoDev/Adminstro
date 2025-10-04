import { Property } from "@/models/listing";
import { Properties } from "@/models/property";
import { connectDb } from "@/util/db";
import { NextRequest, NextResponse } from "next/server";

connectDb();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body?.userId) {
      return NextResponse.json(
        { error: "Missing userId in request body" },
        { status: 400 }
      );
    }

    const { userId } = body;

    // Fetch only necessary fields instead of whole document for efficiency
    const properties = await Properties.find(
      { userId },
      "_id basePrice VSID propertyCoverFileUrl"
    ).lean(); // lean() improves performance by returning plain JS objects

    if (!properties.length) {
      return NextResponse.json(
        { error: "No properties found for this user" },
        { status: 404 }
      );
    }

    return NextResponse.json({ properties }, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching properties:", error);

    return NextResponse.json(
      {
        error: "An internal server error occurred",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
