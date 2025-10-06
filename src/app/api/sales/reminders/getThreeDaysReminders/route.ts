import Query from "@/models/query";
import { connectDb } from "@/util/db";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

connectDb();

export async function GET(req: NextRequest) {
  try {
    const todayDate = new Date();
    const threeDaysLater = new Date(todayDate);
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);


    const allReminders = await Query.find({
      //   $and: [{ reminder: { $exists: true } }, { reminder: { $ne: null } }],
      $and: [
        { reminder: { $exists: true } },
        { reminder: { $lte: threeDaysLater } },
        { reminder: { $gte: todayDate } },
      ],
    }).sort({ reminder: 1 });

    if (allReminders.length === 0) {
      return NextResponse.json({
        error: "No Reminders found",
        status: 400,
      });
    }

    return NextResponse.json({ allReminders }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
