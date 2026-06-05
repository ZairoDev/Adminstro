import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import PersonalReminder from "@/models/personalReminder";
import { connectDb } from "@/util/db";
import { getEmployeeIdFromRequest } from "../_auth";

function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Pending reminders due today or overdue, not dismissed from dashboard banner. */
export async function GET(request: NextRequest) {
  const auth = await getEmployeeIdFromRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDb();

    const now = new Date();
    const endToday = endOfToday();

    const reminders = await PersonalReminder.find({
      employeeId: new mongoose.Types.ObjectId(auth.employeeId),
      status: "pending",
      scheduledAt: { $lte: endToday },
      dismissedAt: null,
    })
      .sort({ scheduledAt: 1 })
      .lean();

    const overdue = reminders.filter(
      (r) => new Date(r.scheduledAt).getTime() < now.getTime(),
    );
    const dueToday = reminders.filter(
      (r) => new Date(r.scheduledAt).getTime() >= now.getTime(),
    );

    return NextResponse.json(
      {
        reminders,
        count: reminders.length,
        overdueCount: overdue.length,
        dueTodayCount: dueToday.length,
      },
      { status: 200 },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch due reminders";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
