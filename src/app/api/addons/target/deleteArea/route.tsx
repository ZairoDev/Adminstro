import { MonthlyTarget } from "@/models/monthlytarget";
import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db"; // make sure you connect DB
import { Area } from "@/models/area";

export async function DELETE(req: NextRequest) {
  await connectDb();
  try {
    const { areaName } = await req.json();

    if (!areaName ) {
      return NextResponse.json(
        { error: "areaName and cityId are required" },
        { status: 400 }
      );
    }

    const updatedDoc = await Area.findOneAndDelete({ _id:areaName });
    if (!updatedDoc) {
      return NextResponse.json({ error: "City not found" }, { status: 404 });
    }

    return NextResponse.json(
      { message: "Area deleted successfully", data: updatedDoc },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
