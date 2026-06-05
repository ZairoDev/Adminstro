import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import PersonalReminder from "@/models/personalReminder";
import { connectDb } from "@/util/db";
import { updatePersonalReminderSchema } from "@/schemas/personalReminder.schema";
import { getEmployeeIdFromRequest } from "../_auth";

type RouteContext = { params: Promise<{ id: string }> };

async function findOwnedReminder(employeeId: string, id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return PersonalReminder.findOne({
    _id: new mongoose.Types.ObjectId(id),
    employeeId: new mongoose.Types.ObjectId(employeeId),
  });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await getEmployeeIdFromRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = updatePersonalReminderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    await connectDb();
    const existing = await findOwnedReminder(auth.employeeId, id);
    if (!existing) {
      return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
    }

    if (parsed.data.scheduledAt) {
      if (parsed.data.scheduledAt.getTime() <= Date.now() && existing.status === "pending") {
        return NextResponse.json(
          { error: "Reminder must be scheduled in the future" },
          { status: 400 },
        );
      }
      existing.scheduledAt = parsed.data.scheduledAt;
      existing.dismissedAt = null;
    }
    if (parsed.data.note !== undefined) existing.note = parsed.data.note.trim();
    if (parsed.data.title !== undefined) existing.title = parsed.data.title.trim();
    if (parsed.data.status !== undefined) existing.status = parsed.data.status;

    await existing.save();

    return NextResponse.json({ reminder: existing }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update reminder";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await getEmployeeIdFromRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await context.params;
    await connectDb();

    const existing = await findOwnedReminder(auth.employeeId, id);
    if (!existing) {
      return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
    }

    existing.status = "cancelled";
    await existing.save();

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete reminder";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
