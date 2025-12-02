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

      if (!reminderDate) {
      return NextResponse.json(
        { error: "Reminder date is required" },
        { status: 400 }
      );
    }

    // Parse the reminder date properly
    const parsedReminderDate = new Date(reminderDate);
    
    // Validate the date
    if (isNaN(parsedReminderDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid reminder date" },
        { status: 400 }
      );
    }

    await Query.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(leadId) },
      { 
        $set: { 
          leadStatus: "reminder", 
          reminder: parsedReminderDate,
          reason: parsedReminderDate.toISOString()
        } 
      }
    );

    return NextResponse.json({ reminderDate: parsedReminderDate }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
