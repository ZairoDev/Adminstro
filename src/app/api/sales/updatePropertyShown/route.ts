import Query from "@/models/query";
import { connectDb } from "@/util/db";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

connectDb();

export async function POST(req: NextRequest) {
  try {
    const { leadId, value, type } = await req.json();
    console.log("lead: ", leadId, value, type);

    if (!leadId || value === undefined) {
      return NextResponse.json({ error: "Insufficient data" }, { status: 400 });
    }

    const parsedValue = Number(value);

    const updatedLead = await Query.updateOne(
      {_id:new mongoose.Types.ObjectId(leadId)},
      { $set: { [`propertyShown`]: parsedValue } },
      {timestamps: false}
    );

    // console.log("updatedLead: ", updatedLead);

    return NextResponse.json(
      {
        message: "Sales Property Shown updated successfully",
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.log("error in priority: ", err);
    return NextResponse.json(
      { error: "Error in updating sales Property Shown" },
      { status: 401 }
    );
  }
}
