import Query from "@/models/query";
import { connectDb } from "@/util/db";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

connectDb();

export async function POST(req: NextRequest) {
  try {
    const { leadId } = await req.json();
    console.log("leadId: ", leadId);

    if (!leadId) {
      return NextResponse.json(
        { error: "Lead ID is required" },
        { status: 400 }
      );
    }

    const lead = await Query.findByIdAndUpdate(
      { _id: new mongoose.Types.ObjectId(leadId) },
      { $set: { rejectionReason: null } }
    );

    console.log("lead: ", lead);

    return NextResponse.json(
      { message: "Lead retrieved successfully" },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
