import { MonthlyTarget } from "@/models/monthlytarget";
import { connectDb } from "@/util/db";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { targetId: string } }
) {
  // await connectDb();
  await connectDb();
  const targetId = params.targetId;
  // console.log("targetId: ", targetId);

  if (!mongoose.Types.ObjectId.isValid(targetId)) {
    return NextResponse.json({ error: "Invalid target ID" }, { status: 400 });
  }

  try {
    const target = await MonthlyTarget.findById(targetId);

    if (!target) {
      return NextResponse.json({ error: "Target not found" }, { status: 404 });
    }

    return NextResponse.json({ target }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
