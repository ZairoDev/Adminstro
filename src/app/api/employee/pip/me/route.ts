import { NextRequest, NextResponse } from "next/server";
import Employees from "@/models/employee";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import type { PIPRecord } from "@/util/type";
export const dynamic = "force-dynamic";
interface AuthPayload {
  id?: string;
}
interface EmployeePips {
  pips?: PIPRecord[];
}
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = (await getDataFromToken(request)) as AuthPayload;
    if (!auth.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDb();
    const employee = (await Employees.findById(auth.id)
      .select("pips")
      .lean()) as EmployeePips | null;
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }
    const pips = employee.pips ?? [];
    return NextResponse.json({
      unacknowledgedPips: pips.filter(
        (pip) => pip.acknowledgmentRequired === true && !pip.acknowledgedAt,
      ),
      activePips: pips.filter((pip) => pip.status === "active"),
    });
  } catch (error: unknown) {
    const authError = error as { status?: number; code?: string };
    if (authError.status === 401 || authError.code) {
      return NextResponse.json(
        { error: "Unauthorized", code: authError.code ?? "AUTH_FAILED" },
        { status: authError.status ?? 401 },
      );
    }
    console.error("Failed to load current employee PIPs:", error);
    return NextResponse.json(
      { error: "Failed to load PIP information" },
      { status: 500 },
    );
  }
}