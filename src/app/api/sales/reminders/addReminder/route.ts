import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import Query from "@/models/query";
import { connectDb } from "@/util/db";

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

    await Query.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(leadId) },
      { $set: { leadStatus: "reminder", reason: reminderDate.toString() } }
    );

    return NextResponse.json({ reminderDate }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
