import { NextRequest, NextResponse } from "next/server";
import { attendanceJsonError, requireSignedIn } from "@/modules/attendance/access";
import { dayQuerySchema } from "@/modules/attendance/schema";
import { getAttendanceDay } from "@/modules/attendance/service";

export async function GET(request: NextRequest) {
  try {
    const actor = await requireSignedIn(request);
    const parsed = dayQuerySchema.safeParse({
      employeeId: request.nextUrl.searchParams.get("employeeId") ?? "",
      date: request.nextUrl.searchParams.get("date") ?? "",
    });
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Invalid query", errors: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const data = await getAttendanceDay(parsed.data.employeeId, parsed.data.date, actor);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return attendanceJsonError(error, "GET /api/attendance/day");
  }
}
