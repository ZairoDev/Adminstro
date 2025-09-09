import { Area } from "@/models/area";
import { MonthlyTarget } from "@/models/monthlytarget";
import { connectDb } from "@/util/db";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  req: NextRequest,
  { params }: { params: { targetId: string } }
) {
  await connectDb();
  try {
    const body = await req.json();
    if (!body) {
      return NextResponse.json({ error: "No data provided" }, { status: 400 });
    }
    // console.log("body: ", body);
    const area = await Area.create(body);
    const target = await MonthlyTarget.findById(params.targetId);
    if (target) {
      target.area = area._id;
      await target.save();
    }

    return NextResponse.json(
      {
        message: body.area
          ? "Area added successfully"
          : "Target updated successfully",
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Update Target Error:", err);
    return NextResponse.json(
      { error: "Unable to update target" },
      { status: 500 }
    );
  }
}
