import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { connectDb } from "@/util/db";
import EmployeeActivityLog from "@/models/employeeActivityLog";

connectDb();

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  employeeIds: z.array(z.string()).min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: "Invalid body" }, { status: 400 });
    }

    const { employeeIds } = parsed.data;

    const results = await EmployeeActivityLog.aggregate([
      { $match: { employeeId: { $in: employeeIds }, status: "active", activityType: "login" } },
      { $group: { _id: "$employeeId", count: { $sum: 1 } } },
    ]).exec();

    const map: Record<string, number> = {};
    results.forEach((r: any) => {
      map[r._id] = r.count;
    });

    return NextResponse.json({ success: true, counts: map });
  } catch (error: any) {
    console.error("Error fetching active session counts:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}

