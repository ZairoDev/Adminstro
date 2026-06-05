import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";

export async function getEmployeeIdFromRequest(
  request: NextRequest,
): Promise<{ employeeId: string } | NextResponse> {
  try {
    const payload = await getDataFromToken(request);
    const employeeId = String((payload as { id?: string }).id ?? "").trim();
    if (!employeeId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return { employeeId };
  } catch (err: unknown) {
    const error = err as { status?: number; code?: string };
    return NextResponse.json(
      { error: error?.code || "AUTH_FAILED" },
      { status: error?.status || 401 },
    );
  }
}
