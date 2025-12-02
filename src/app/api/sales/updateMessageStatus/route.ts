import Query from "@/models/query";
import { connectDb } from "@/util/db";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

connectDb();

export async function POST(req: NextRequest) {
  try {
    const { leadId, changedStatus } = await req.json();
    console.log("lead: ", leadId, changedStatus);

    if (!leadId || !changedStatus) {
      return NextResponse.json({ error: "Insufficient data" }, { status: 400 });
    }

    const updatedLead = await Query.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(leadId) },
      { $set: { messageStatus: changedStatus } },
      { new: true } // Return the updated document
    );

    if (!updatedLead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json(
      { 
        message: "Message status updated successfully",
        data: updatedLead
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.log("error in status: ", err);
    return NextResponse.json(
      { error: "Error in updating message status" },
      { status: 500 }
    );
  }
}
