import { NextRequest } from "next/server";
import { attendanceJsonError, requireAttendanceReader } from "@/modules/attendance/access";
import { exportQuerySchema } from "@/modules/attendance/schema";
import { exportAttendanceCsv } from "@/modules/attendance/service";

export async function GET(request: NextRequest) {
  try {
    await requireAttendanceReader(request);
    const parsed = exportQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams.entries()),
    );
    if (!parsed.success) {
      return new Response(JSON.stringify({ success: false, message: "Invalid query" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const csv = await exportAttendanceCsv(parsed.data);
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="attendance-${parsed.data.month}.csv"`,
      },
    });
  } catch (error) {
    return attendanceJsonError(error, "GET /api/attendance/export");
  }
}
