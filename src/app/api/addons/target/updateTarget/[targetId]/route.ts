
import { MonthlyTarget } from "@/models/monthlytarget";
import { connectDb } from "@/util/db";
import { NextRequest, NextResponse } from "next/server";


export async function PUT(
  req: NextRequest,
  { params }: { params: { targetId: string } }
) {
  await connectDb();
  try {
    console.log("params: ", params);
    const body = await req.json();
    if(!body) return NextResponse.json({ error: "No data provided" }, { status: 400 });
    console.log("body: ", body);
    const monthlytarget = await MonthlyTarget.findById({
      _id: params.targetId,
    });
    if(body.area){
      body.area = body.area.toLowerCase();
      monthlytarget.area.push(body.area);
    }
    else{
    const updatedTarget = await MonthlyTarget.findByIdAndUpdate(
      params.targetId,
      body,
      { new: true }
    );
  }
  monthlytarget.save();
    return NextResponse.json({ message: "Target updated successfully" }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Unable to update target" },
      { status: 500 }
    );
  }
}
