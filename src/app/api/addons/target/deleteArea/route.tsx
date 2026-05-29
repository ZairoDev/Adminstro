import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDb } from "@/util/db";
import { Area } from "@/models/area";

export async function DELETE(req: NextRequest) {
  await connectDb();
  try {
    const { areaName, areaId } = await req.json();
    const id = areaId ?? areaName;

    if (!id || !mongoose.Types.ObjectId.isValid(String(id))) {
      return NextResponse.json(
        { error: "Valid areaId is required" },
        { status: 400 },
      );
    }

    const updatedDoc = await Area.findByIdAndDelete(id);
    if (!updatedDoc) {
      return NextResponse.json({ error: "Area not found" }, { status: 404 });
    }

    return NextResponse.json(
      { message: "Area deleted successfully", data: updatedDoc },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
