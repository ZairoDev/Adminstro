import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";

import mongoose from "mongoose";
import { Property } from "@/models/listing";
import { getDataFromToken } from "@/util/getDataFromToken";

connectDb();

export async function POST(req: NextRequest) {
  try {
    // Authenticate request
    let auth: any;
    try {
      auth = await getDataFromToken(req);
    } catch (err: any) {
      const status = err?.status ?? 401;
      const code = err?.code ?? "AUTH_FAILED";
      return NextResponse.json(
        { success: false, code, message: "Unauthorized" },
        { status },
      );
    }

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
