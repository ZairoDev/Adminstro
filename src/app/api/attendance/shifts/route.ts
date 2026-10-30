import { NextRequest, NextResponse } from "next/server";
import {
  attendanceJsonError,
  requireAttendancePolicyAdmin,
  requireAttendanceReader,
} from "@/modules/attendance/access";
import { shiftCreateSchema } from "@/modules/attendance/schema";
import { createShift, listShifts } from "@/modules/attendance/service";

export async function GET(request: NextRequest) {
  try {
    await requireAttendanceReader(request);
    const data = await listShifts();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return attendanceJsonError(error, "GET /api/attendance/shifts");
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAttendancePolicyAdmin(request);
    const body: unknown = await request.json();
    const parsed = shiftCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Check the shift and try again", errors: parsed.error.flatten() },
        { status: 400 },
      );
    }
    await createShift(parsed.data);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    return attendanceJsonError(error, "POST /api/attendance/shifts");
  }
}
