import { NextRequest, NextResponse } from "next/server";
import { attendanceJsonError, requireAttendanceReader } from "@/modules/attendance/access";
import { decideLeave } from "@/modules/attendance/leave/service";
import { leaveDecisionSchema } from "@/modules/attendance/leave/schema";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const actor = await requireAttendanceReader(request);
    const { id } = await context.params;
    const body: unknown = await request.json();
    const parsed = leaveDecisionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Choose approve or reject", errors: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const data = await decideLeave(id, parsed.data, actor);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return attendanceJsonError(error, "POST /api/attendance/leaves/[id]/decision");
  }
}
