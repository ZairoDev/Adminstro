import { NextRequest, NextResponse } from "next/server";
import { attendanceJsonError, requireSignedIn } from "@/modules/attendance/access";
import { applyLeave, listLeaves } from "@/modules/attendance/leave/service";
import { leaveApplySchema, leaveListQuerySchema } from "@/modules/attendance/leave/schema";

export async function GET(request: NextRequest) {
  try {
    const actor = await requireSignedIn(request);
    const parsed = leaveListQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams.entries()),
    );
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Check the filters and try again", errors: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const data = await listLeaves(parsed.data, actor);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return attendanceJsonError(error, "GET /api/attendance/leaves");
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireSignedIn(request);
    const body: unknown = await request.json();
    const parsed = leaveApplySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Check the leave details and try again", errors: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const data = await applyLeave(parsed.data, actor);
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    return attendanceJsonError(error, "POST /api/attendance/leaves");
  }
}
