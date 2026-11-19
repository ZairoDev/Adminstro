import { NextRequest, NextResponse } from "next/server";
import { attendanceJsonError, requireSignedIn } from "@/modules/attendance/access";
import { previewLeave } from "@/modules/attendance/leave/service";
import { leaveRangeSchema } from "@/modules/attendance/leave/schema";

export async function POST(request: NextRequest) {
  try {
    const actor = await requireSignedIn(request);
    const body: unknown = await request.json();
    const parsed = leaveRangeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Choose the leave type and dates", errors: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const data = await previewLeave(parsed.data, actor);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return attendanceJsonError(error, "POST /api/attendance/leaves/preview");
  }
}
