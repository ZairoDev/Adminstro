import { NextRequest, NextResponse } from "next/server";
import { attendanceJsonError, requireAttendancePolicyAdmin } from "@/modules/attendance/access";
import { deleteHoliday } from "@/modules/attendance/service";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    await requireAttendancePolicyAdmin(request);
    const { id } = await context.params;
    await deleteHoliday(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return attendanceJsonError(error, "DELETE /api/attendance/holidays/[id]");
  }
}
