import { Properties } from "@/models/property";
import { connectDb } from "@/util/db";
import { NextRequest, NextResponse } from "next/server";

connectDb();

export async function POST(request: NextRequest) {
  const { commonId } = await request.json();
  if (!commonId) {
    return NextResponse.json({ error: "Common Id not found" }, { status: 400 });
  }
  try {
    console.log("commonId: ", commonId);
    const commonIdProperties = await Properties.find({ commonId });
    if (!commonIdProperties) {
      return NextResponse.json(
        { message: "No other porperties are there with this CommonId" },
        { status: 200 }
      );
    }
    console.log("common: ", commonIdProperties);
    return NextResponse.json({ commonIdProperties }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: "Something went wrong!" },
      { status: 400 }
    );
  }
}
