import { NextRequest, NextResponse } from "next/server";
import { attendanceJsonError, requireSignedIn } from "@/modules/attendance/access";
import { countPendingLeaveDecisions } from "@/modules/attendance/leave/service";

export async function GET(request: NextRequest) {
  try {
    const actor = await requireSignedIn(request);
    const count = await countPendingLeaveDecisions(actor);
    return NextResponse.json({ success: true, data: { count } });
  } catch (error) {
    return attendanceJsonError(error, "GET /api/attendance/leaves/pending-count");
  }
}
