import { NextRequest, NextResponse } from "next/server";
import {
  attendanceJsonError,
  requireAttendancePolicyAdmin,
  requireAttendanceReader,
} from "@/modules/attendance/access";
import { policyUpdateSchema } from "@/modules/attendance/schema";
import { getPolicyView, updateAttendancePolicy } from "@/modules/attendance/service";

export async function GET(request: NextRequest) {
  try {
    await requireAttendanceReader(request);
    const data = await getPolicyView();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return attendanceJsonError(error, "GET /api/attendance/policy");
  }
}

export async function PUT(request: NextRequest) {
  try {
    const actor = await requireAttendancePolicyAdmin(request);
    const body: unknown = await request.json();
    const parsed = policyUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Check the policy and try again", errors: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const data = await updateAttendancePolicy(parsed.data, actor);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return attendanceJsonError(error, "PUT /api/attendance/policy");
  }
}
