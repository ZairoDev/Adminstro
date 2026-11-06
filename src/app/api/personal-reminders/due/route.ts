import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import PersonalReminder from "@/models/personalReminder";
import { connectDb } from "@/util/db";
import { isPersonalReminderNotificationDue } from "@/util/personalReminderTiming";
import { ensureInterviewRemindersForEmployee } from "@/lib/interviews/syncInterviewReminder";
import { getEmployeeIdFromRequest } from "../_auth";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Reminders whose scheduled time has arrived, until the user dismisses them. */
export async function GET(request: NextRequest) {
  const auth = await getEmployeeIdFromRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDb();
    await ensureInterviewRemindersForEmployee(auth.employeeId);

    const now = new Date();
    const todayStart = startOfToday();
    const employeeId = new mongoose.Types.ObjectId(auth.employeeId);
    // Email is marked sent a few minutes early. Keep those visible once the
    // time arrives, without resurfacing older reminders that were already mailed.
    const sentSince = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    const reminders = (
      await PersonalReminder.find({
        employeeId,
        dismissedAt: null,
        $or: [
          { status: "pending", scheduledAt: { $lte: now } },
          { status: "sent", scheduledAt: { $lte: now, $gte: sentSince } },
        ],
      })
        .sort({ scheduledAt: 1 })
        .lean()
    ).filter((reminder) =>
      isPersonalReminderNotificationDue(new Date(reminder.scheduledAt), now),
    );

    const next = await PersonalReminder.findOne({
      employeeId,
      status: { $in: ["pending", "sent"] },
      dismissedAt: null,
      scheduledAt: { $gt: now },
    })
      .sort({ scheduledAt: 1 })
      .select("scheduledAt")
      .lean();

    const overdue = reminders.filter(
      (r) => new Date(r.scheduledAt).getTime() < todayStart.getTime(),
    );
    const dueToday = reminders.filter(
      (r) => new Date(r.scheduledAt).getTime() >= todayStart.getTime(),
    );

    return NextResponse.json(
      {
        reminders,
        count: reminders.length,
        overdueCount: overdue.length,
        dueTodayCount: dueToday.length,
        nextScheduledAt: next?.scheduledAt
          ? new Date(next.scheduledAt).toISOString()
          : null,
      },
      { status: 200 },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch due reminders";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
