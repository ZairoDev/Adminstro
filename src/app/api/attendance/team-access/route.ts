import { NextRequest, NextResponse } from "next/server";
import { attendanceJsonError, requireSignedIn } from "@/modules/attendance/access";
import { attendanceNavScope } from "@/modules/attendance/team-scope";

export async function GET(request: NextRequest) {
  try {
    const actor = await requireSignedIn(request);
    const scope = await attendanceNavScope(actor);
    return NextResponse.json({ success: true, data: { scope } });
  } catch (error) {
    return attendanceJsonError(error, "GET /api/attendance/team-access");
  }
}
