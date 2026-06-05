import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import PersonalReminder from "@/models/personalReminder";
import { connectDb } from "@/util/db";
import { createPersonalReminderSchema } from "@/schemas/personalReminder.schema";
import { getEmployeeIdFromRequest } from "./_auth";

export async function GET(request: NextRequest) {
  const auth = await getEmployeeIdFromRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDb();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const filter: Record<string, unknown> = {
      employeeId: new mongoose.Types.ObjectId(auth.employeeId),
    };

    if (status && ["pending", "sent", "cancelled"].includes(status)) {
      filter.status = status;
    } else {
      filter.status = { $ne: "cancelled" };
    }

    if (from || to) {
      const scheduledAt: Record<string, Date> = {};
      if (from) {
        const d = new Date(from);
        if (!isNaN(d.getTime())) scheduledAt.$gte = d;
      }
      if (to) {
        const d = new Date(to);
        if (!isNaN(d.getTime())) scheduledAt.$lte = d;
      }
      if (Object.keys(scheduledAt).length > 0) {
        filter.scheduledAt = scheduledAt;
      }
    }

    const reminders = await PersonalReminder.find(filter)
      .sort({ scheduledAt: 1 })
      .lean();

    return NextResponse.json({ reminders }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch reminders";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await getEmployeeIdFromRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const parsed = createPersonalReminderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const scheduledAt = parsed.data.scheduledAt;
    if (scheduledAt.getTime() <= Date.now()) {
      return NextResponse.json(
        { error: "Reminder must be scheduled in the future" },
        { status: 400 },
      );
    }

    await connectDb();

    const title =
      parsed.data.title?.trim() ||
      parsed.data.note.trim().slice(0, 80) +
        (parsed.data.note.length > 80 ? "…" : "");

    const reminder = await PersonalReminder.create({
      employeeId: new mongoose.Types.ObjectId(auth.employeeId),
      title,
      note: parsed.data.note.trim(),
      scheduledAt,
      status: "pending",
      emailSentAt: null,
      dismissedAt: null,
    });

    return NextResponse.json({ reminder }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create reminder";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
