import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import PersonalReminder from "@/models/personalReminder";
import { connectDb } from "@/util/db";
import { getEmployeeIdFromRequest } from "../../_auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await getEmployeeIdFromRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    await connectDb();

    const reminder = await PersonalReminder.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(id),
        employeeId: new mongoose.Types.ObjectId(auth.employeeId),
      },
      { $set: { dismissedAt: new Date() } },
      { new: true },
    );

    if (!reminder) {
      return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
    }

    return NextResponse.json({ reminder }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to dismiss reminder";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
