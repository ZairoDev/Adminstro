import Query from "@/models/query";
import { connectDb } from "@/util/db";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

connectDb();

export async function POST(req: NextRequest) {
  try {
    const { leadId } = await req.json();

    if (!leadId) {
      return NextResponse.json(
        { error: "Lead ID is required" },
        { status: 400 }
      );
    }

    // First get the lead to know the OLD disposition
    const existingLead = await Query.findById(leadId);
    if (!existingLead) {
      return NextResponse.json(
        { error: "Lead not found" },
        { status: 404 }
      );
    }

    // Update the lead to fresh
    const updatedLead = await Query.findByIdAndUpdate(
      { _id: new mongoose.Types.ObjectId(leadId) },
      { $set: { leadStatus: "fresh", reason: null } },
      { new: true } // Return updated document
    );

    // Socket emit is now handled client-side via "lead-disposition-changed" event

    return NextResponse.json(
      { message: "Lead retrieved successfully", data: updatedLead },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("❌ Error retrieving lead:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
