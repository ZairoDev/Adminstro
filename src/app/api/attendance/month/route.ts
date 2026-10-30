import { NextRequest, NextResponse } from "next/server";
import { attendanceJsonError, requireAttendanceReader } from "@/modules/attendance/access";
import { monthQuerySchema } from "@/modules/attendance/schema";
import { getAttendanceMonth } from "@/modules/attendance/service";

export async function GET(request: NextRequest) {
  try {
    const actor = await requireAttendanceReader(request);
    const parsed = monthQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams.entries()),
    );
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Invalid query", errors: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const data = await getAttendanceMonth(parsed.data, actor);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return attendanceJsonError(error, "GET /api/attendance/month");
  }
}
