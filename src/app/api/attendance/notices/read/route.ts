import { NextRequest, NextResponse } from "next/server";
import { attendanceJsonError, requireSignedIn } from "@/modules/attendance/access";
import { markNoticeReadSchema } from "@/modules/attendance/notices/schema";
import { markAttendanceNoticeRead } from "@/modules/attendance/notices/service";

export async function POST(request: NextRequest) {
  try {
    const actor = await requireSignedIn(request);
    const body: unknown = await request.json();
    const parsed = markNoticeReadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Invalid notice", errors: parsed.error.flatten() },
        { status: 400 },
      );
    }
    await markAttendanceNoticeRead(actor.id, parsed.data.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return attendanceJsonError(error, "POST /api/attendance/notices/read");
  }
}
