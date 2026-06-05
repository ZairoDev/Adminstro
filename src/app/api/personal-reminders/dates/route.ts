import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import PersonalReminder from "@/models/personalReminder";
import { connectDb } from "@/util/db";
import { getEmployeeIdFromRequest } from "../_auth";

/** Returns YYYY-MM-DD strings for days that have at least one reminder in the given month. */
export async function GET(request: NextRequest) {
  const auth = await getEmployeeIdFromRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year") ?? "", 10);
    const month = parseInt(searchParams.get("month") ?? "", 10);

    if (!year || !month || month < 1 || month > 12) {
      return NextResponse.json(
        { error: "year and month query params are required" },
        { status: 400 },
      );
    }

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    await connectDb();

    const reminders = await PersonalReminder.find({
      employeeId: new mongoose.Types.ObjectId(auth.employeeId),
      status: { $ne: "cancelled" },
      scheduledAt: { $gte: start, $lte: end },
    })
      .select("scheduledAt")
      .lean();

    const dateSet = new Set<string>();
    for (const r of reminders) {
      const d = new Date(r.scheduledAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      dateSet.add(key);
    }

    return NextResponse.json({ dates: Array.from(dateSet) }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch dates";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
