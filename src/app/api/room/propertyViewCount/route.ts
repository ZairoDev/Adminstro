import { Properties } from "@/models/property";
import Rooms from "@/models/room";
import { connectDb } from "@/util/db";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

connectDb();

export async function POST(req: NextRequest) {
  try {
    const { propertyId, client } = await req.json();

    if (!propertyId) {
      return NextResponse.json(
        { error: "Property Id is required" },
        { status: 400 }
      );
    }

    const property = Properties.findByIdAndUpdate(
      { _id: new mongoose.Types.ObjectId(propertyId) },
      { $inc: { views: 1 } }
    );

    return NextResponse.json(
      { message: "Property View Incremented" },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.log("error in scheduling visit: ", err);
    return NextResponse.json(
      { error: "Error in scheduling visit" },
      { status: 400 }
    );
  }
}
