import { NextRequest, NextResponse } from "next/server";
import { attendanceJsonError, requireSignedIn } from "@/modules/attendance/access";
import { getLeaveBalance } from "@/modules/attendance/leave/service";
import { leaveBalanceQuerySchema } from "@/modules/attendance/leave/schema";

export async function GET(request: NextRequest) {
  try {
    const actor = await requireSignedIn(request);
    const parsed = leaveBalanceQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams.entries()),
    );
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Check the employee and try again", errors: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const data = await getLeaveBalance(parsed.data.employeeId, actor);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return attendanceJsonError(error, "GET /api/attendance/leave-balance");
  }
}
