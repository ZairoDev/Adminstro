import Employees from "@/models/employee";
import { NextRequest, NextResponse } from "next/server";
import { excludeTestAccountFromQuery } from "@/util/employeeConstants";
import { getDataFromToken } from "@/util/getDataFromToken";

export async function GET(req: NextRequest) {
  try {
    await getDataFromToken(req);
    const query = excludeTestAccountFromQuery({ role: "Sales", isActive: true });
    const emp = await Employees.find(query).exec();
    return NextResponse.json({ emp }, { status: 200 });
  } catch (error: unknown) {
    const err = error as { status?: number; code?: string };
    if (err?.status === 401 || err?.code) {
      return NextResponse.json(
        { code: err.code || "AUTH_FAILED" },
        { status: err.status || 401 }
      );
    }
    console.log(error);
    return NextResponse.json({ error: "Failed to fetch sales employees" }, { status: 500 });
  }
}