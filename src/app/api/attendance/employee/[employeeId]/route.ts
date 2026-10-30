import { NextRequest, NextResponse } from "next/server";
import { attendanceJsonError, requireSignedIn } from "@/modules/attendance/access";
import { employeeMonthQuerySchema } from "@/modules/attendance/schema";
import { getEmployeeAttendance } from "@/modules/attendance/service";

type RouteContext = { params: Promise<{ employeeId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const actor = await requireSignedIn(request);
    const { employeeId } = await context.params;
    const parsed = employeeMonthQuerySchema.safeParse({
      month: request.nextUrl.searchParams.get("month") ?? "",
    });
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Invalid month", errors: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const data = await getEmployeeAttendance(employeeId, parsed.data.month, actor);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return attendanceJsonError(error, "GET /api/attendance/employee/[employeeId]");
  }
}
