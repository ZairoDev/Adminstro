import { NextRequest, NextResponse } from "next/server";
import {
  attendanceJsonError,
  requireAttendancePolicyAdmin,
  requireAttendanceReader,
} from "@/modules/attendance/access";
import { departmentShiftClearSchema, departmentShiftSchema } from "@/modules/attendance/schema";
import { clearDepartmentShift, listDepartmentShifts, saveDepartmentShift } from "@/modules/attendance/service";

export async function GET(request: NextRequest) {
  try {
    await requireAttendanceReader(request);
    const data = await listDepartmentShifts();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return attendanceJsonError(error, "GET /api/attendance/department-shifts");
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAttendancePolicyAdmin(request);
    const body: unknown = await request.json();
    const parsed = departmentShiftSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Check the shift times and try again", errors: parsed.error.flatten() },
        { status: 400 },
      );
    }
    await saveDepartmentShift(parsed.data);
    return NextResponse.json({ success: true });
  } catch (error) {
    return attendanceJsonError(error, "PUT /api/attendance/department-shifts");
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAttendancePolicyAdmin(request);
    const parsed = departmentShiftClearSchema.safeParse({
      departmentId: request.nextUrl.searchParams.get("departmentId") ?? "",
      jobPositionId: request.nextUrl.searchParams.get("jobPositionId") ?? "",
    });
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Check the department and try again", errors: parsed.error.flatten() },
        { status: 400 },
      );
    }
    await clearDepartmentShift(parsed.data.departmentId, parsed.data.jobPositionId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return attendanceJsonError(error, "DELETE /api/attendance/department-shifts");
  }
}
