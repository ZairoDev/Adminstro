import { NextRequest, NextResponse } from "next/server";
import { attendanceJsonError, requireAttendanceReader } from "@/modules/attendance/access";
import { lopQuerySchema } from "@/modules/attendance/schema";
import { getEmployeeLop } from "@/modules/attendance/service";

export async function GET(request: NextRequest) {
  try {
    await requireAttendanceReader(request);
    const parsed = lopQuerySchema.safeParse({
      month: request.nextUrl.searchParams.get("month") ?? "",
      employeeId: request.nextUrl.searchParams.get("employeeId") ?? "",
    });
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Invalid query", errors: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const data = await getEmployeeLop(parsed.data.employeeId, parsed.data.month);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return attendanceJsonError(error, "GET /api/attendance/lop");
  }
}
