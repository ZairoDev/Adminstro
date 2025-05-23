import Query from "@/models/query";
import { connectDb } from "@/util/db";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

connectDb();

export async function GET(req: NextRequest) {
  try {
    const allReminders = await Query.find({
      $and: [{ reminder: { $exists: true } }, { reminder: { $ne: null } }],
    });

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
