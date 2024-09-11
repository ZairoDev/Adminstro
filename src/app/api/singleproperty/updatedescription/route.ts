import { Property } from "@/models/listing";
import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import mongoose from "mongoose";

connectDb();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { propertyId, formData, newReviews } = body;
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

    const property = await Property.findById(id);

    if (!property) {
      return NextResponse.json(
        { message: "Property not found." },
        { status: 404 }
      );
    }

    property.newReviews = newReviews;
    await property.save();

    return NextResponse.json({message: "Description Updated successfully"},{ status: 200 });

  } catch (error) {
    console.error("Error fetching property:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
