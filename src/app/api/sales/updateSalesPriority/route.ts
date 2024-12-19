import Query from "@/models/query";
import { connectDb } from "@/util/db";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

connectDb();

export async function POST(req: NextRequest) {
  try {
    const { leadId, changedPriority } = await req.json();
    console.log("lead: ", leadId, changedPriority);

    if (!leadId || !changedPriority) {
      return NextResponse.json({ error: "Insufficient data" }, { status: 400 });
    }

    const updatedLead = await Query.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(leadId) },
      { $set: { salesPriority: changedPriority } }
    );

    return NextResponse.json(
      { message: "Sales priority updated successfully" },
      { status: 200 }
    );
  } catch (err: any) {
    console.log("error in priority: ", err);
    return NextResponse.json(
      { error: "Error in updating sales priority" },
      { status: 401 }
    );
  }
}
