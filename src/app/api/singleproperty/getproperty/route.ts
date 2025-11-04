import { Property } from "@/models/listing";
import { NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import mongoose from "mongoose";
import { Properties } from "@/models/property";

connectDb();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { propertyId } = body;
    const id = propertyId[0];


    if (!id) {
      return NextResponse.json(
        { message: "Property ID is required." },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Invalid property ID." },
        { status: 400 }
      );
    }

    const property = await Properties.findById(id);

    if (!id) {
      return NextResponse.json(
        { message: "Property not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(property, { status: 200 });
  } catch (error) {
    console.error("Error fetching property:", error);
    return NextResponse.json(
      { message: "Internal server error." },
      { status: 500 }
    );
  }
}
