import { NextRequest, NextResponse } from "next/server";
import { attendanceJsonError, requireAttendanceReader } from "@/modules/attendance/access";
import { correctionSchema } from "@/modules/attendance/schema";
import { correctAttendanceRecord } from "@/modules/attendance/service";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const actor = await requireAttendanceReader(request);
    const { id } = await context.params;
    const body: unknown = await request.json();
    const parsed = correctionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Check the correction and try again", errors: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const data = await correctAttendanceRecord(id, parsed.data, actor);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return attendanceJsonError(error, "PATCH /api/attendance/records/[id]");
  }
}
