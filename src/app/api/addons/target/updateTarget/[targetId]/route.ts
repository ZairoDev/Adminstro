
import { MonthlyTarget } from "@/models/monthlytarget";
import { connectDb } from "@/util/db";
import { NextRequest, NextResponse } from "next/server";


export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  await connectDb();
  try {
    const body = await req.json();
    const updatedTarget = await MonthlyTarget.findByIdAndUpdate(
      params.id,
      body,
      { new: true }
    );
    return NextResponse.json(updatedTarget, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Unable to update target" },
      { status: 500 }
    );
  }
}
