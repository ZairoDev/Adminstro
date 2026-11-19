import { NextRequest, NextResponse } from "next/server";
import { attendanceJsonError, requireAttendanceReader } from "@/modules/attendance/access";
import { adjustLeaveBalance } from "@/modules/attendance/leave/service";
import { leaveBalanceAdjustSchema } from "@/modules/attendance/leave/schema";

export async function POST(request: NextRequest) {
  try {
    const actor = await requireAttendanceReader(request);
    const body: unknown = await request.json();
    const parsed = leaveBalanceAdjustSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Check the adjustment and try again", errors: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const data = await adjustLeaveBalance(parsed.data, actor);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return attendanceJsonError(error, "POST /api/attendance/leave-balance/adjust");
  }
}
