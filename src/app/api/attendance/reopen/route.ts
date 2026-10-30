import { NextRequest, NextResponse } from "next/server";
import { attendanceJsonError, requireAttendancePolicyAdmin } from "@/modules/attendance/access";
import { periodSchema } from "@/modules/attendance/schema";
import { reopenAttendanceMonth } from "@/modules/attendance/service";

export async function POST(request: NextRequest) {
  try {
    const actor = await requireAttendancePolicyAdmin(request);
    const body: unknown = await request.json();
    const parsed = periodSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Invalid month", errors: parsed.error.flatten() },
        { status: 400 },
      );
    }
    await reopenAttendanceMonth(parsed.data.month, actor);
    return NextResponse.json({ success: true });
  } catch (error) {
    return attendanceJsonError(error, "POST /api/attendance/reopen");
  }
}
