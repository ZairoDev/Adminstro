import { NextRequest, NextResponse } from "next/server";
import { attendanceJsonError, requireSignedIn } from "@/modules/attendance/access";
import { listAttendanceNotices } from "@/modules/attendance/notices/service";

export async function GET(request: NextRequest) {
  try {
    const actor = await requireSignedIn(request);
    const data = await listAttendanceNotices(actor.id);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return attendanceJsonError(error, "GET /api/attendance/notices");
  }
}
