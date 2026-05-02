import { Properties } from "@/models/property";
import { connectDb } from "@/util/db";
import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";

connectDb();

export async function POST(request: NextRequest) {
  try {
    await getDataFromToken(request);
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
  } catch (err: unknown) {
    const error = err as { status?: number; code?: string; message?: string };
    if (error?.status) {
      return NextResponse.json(
        { code: error.code || "AUTH_FAILED" },
        { status: error.status },
      );
    }
    console.error("Error fetching properties:", err);
    return NextResponse.json(
      {
        error: "An internal server error occurred",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
