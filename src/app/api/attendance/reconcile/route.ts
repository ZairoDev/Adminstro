import { NextRequest, NextResponse } from "next/server";
import { attendanceJsonError, requireAttendancePolicyAdmin } from "@/modules/attendance/access";
import { reconcileSchema } from "@/modules/attendance/schema";
import { reconcileRange } from "@/modules/attendance/service";

export async function POST(request: NextRequest) {
  try {
    await requireAttendancePolicyAdmin(request);
    const body: unknown = await request.json();
    const parsed = reconcileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Invalid date range", errors: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const data = await reconcileRange(parsed.data.from, parsed.data.to);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return attendanceJsonError(error, "POST /api/attendance/reconcile");
  }
}
