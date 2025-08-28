import { MonthlyTarget } from "@/models/monthlytarget";
import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db"; // make sure you connect DB

export async function DELETE(req: NextRequest) {
  await connectDb();
  try {
    const { areaName, cityId } = await req.json();

    if (!areaName || !cityId) {
      return NextResponse.json(
        { error: "areaName and cityId are required" },
        { status: 400 }
      );
    }

    const updatedDoc = await MonthlyTarget.findByIdAndUpdate(
      cityId,
      { $pull: { area: { name: areaName } } }, // remove area by its name
      { new: true }
    );

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
