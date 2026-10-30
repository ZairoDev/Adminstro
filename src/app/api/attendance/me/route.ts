import { NextRequest, NextResponse } from "next/server";
import { attendanceJsonError, requireSignedIn } from "@/modules/attendance/access";
import { currentPayrollMonth } from "@/modules/finance/salary-month";
import { getEmployeeAttendance } from "@/modules/attendance/service";

export async function GET(request: NextRequest) {
  try {
    const actor = await requireSignedIn(request);
    const month = request.nextUrl.searchParams.get("month") ?? currentPayrollMonth().key;
    const data = await getEmployeeAttendance(actor.id, month, actor);
    return NextResponse.json({ success: true, data: { ...data, canCorrect: false } });
  } catch (error) {
    return attendanceJsonError(error, "GET /api/attendance/me");
  }
}
