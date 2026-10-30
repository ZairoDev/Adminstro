import { NextRequest, NextResponse } from "next/server";
import { attendanceJsonError, requireAttendanceReader } from "@/modules/attendance/access";
import { periodSchema } from "@/modules/attendance/schema";
import { getAttendanceSummary } from "@/modules/attendance/service";

export async function GET(request: NextRequest) {
  try {
    await requireAttendanceReader(request);
    const parsed = periodSchema.safeParse({
      month: request.nextUrl.searchParams.get("month") ?? "",
    });
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Invalid month", errors: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const data = await getAttendanceSummary(parsed.data.month);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return attendanceJsonError(error, "GET /api/attendance/summary");
  }
}
