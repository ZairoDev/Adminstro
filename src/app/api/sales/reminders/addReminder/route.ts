import Query from "@/models/query";
import { connectDb } from "@/util/db";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

connectDb();

export async function POST(req: NextRequest) {
  try {
    const { leadId, reminderDate } = await req.json();

    if (!leadId) {
      return NextResponse.json(
        { error: "Lead ID is required" },
        { status: 400 }
      );
    }

    const addReminder = await Query.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(leadId) },
      { $set: { reminder: reminderDate } }
    );

    return NextResponse.json({ reminderDate }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}