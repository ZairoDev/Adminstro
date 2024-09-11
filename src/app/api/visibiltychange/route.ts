import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";

import mongoose from "mongoose";
import { Property } from "@/models/listing";

connectDb();

export async function POST(req: NextRequest) {
  try {
    const { id, isLive }: { id: string; isLive: boolean } = await req.json();

    if (!id || typeof isLive !== "boolean") {
      return NextResponse.json(
        { message: "Invalid data provided." },
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

    property.isLive = isLive;

    await property.save();

    return NextResponse.json({
      message: `Property has been successfully ${
        isLive ? "made live" : "hidden"
      }.`,
      property,
    });
  } catch (error) {
    console.error("Error updating property:", error);
    return NextResponse.json(
      { message: "Something went wrong." },
      { status: 500 }
    );
  }
}
