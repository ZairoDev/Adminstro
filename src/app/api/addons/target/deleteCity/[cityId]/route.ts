import { Area } from "@/models/area";
import { MonthlyTarget } from "@/models/monthlytarget";
import { normalizeCityKey } from "@/lib/city-normalizer";
import { connectDb } from "@/util/db";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ cityId: string }> },
) {
  await connectDb();
  try {
    const { cityId } = await params;
    if (!mongoose.Types.ObjectId.isValid(cityId)) {
      return NextResponse.json({ error: "Invalid city id" }, { status: 400 });
    }

    const target = await MonthlyTarget.findById(cityId);
    if (!target) {
      return NextResponse.json({ error: "City target not found" }, { status: 404 });
    }

    const cityKey = normalizeCityKey(target.city || "");
    const allAreas = await Area.find({}).select("_id city").lean();
    const areaIds = allAreas
      .filter((a) => normalizeCityKey(String(a.city || "")) === cityKey)
      .map((a) => a._id);

    if (areaIds.length > 0) {
      await Area.deleteMany({ _id: { $in: areaIds } });
    }

    await MonthlyTarget.findByIdAndDelete(cityId);

    return NextResponse.json(
      { message: "City and its areas deleted successfully" },
      { status: 200 },
    );
  } catch (err) {
    console.error("Delete city error:", err);
    return NextResponse.json(
      { error: "Unable to delete city" },
      { status: 500 },
    );
  }
}
