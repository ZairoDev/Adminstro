import { NextRequest, NextResponse } from "next/server";
import { attendanceJsonError, requireSignedIn } from "@/modules/attendance/access";
import { getLeaveRequest } from "@/modules/attendance/leave/service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const actor = await requireSignedIn(request);
    const { id } = await context.params;
    const data = await getLeaveRequest(id, actor);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return attendanceJsonError(error, "GET /api/attendance/leaves/[id]");
  }
}
