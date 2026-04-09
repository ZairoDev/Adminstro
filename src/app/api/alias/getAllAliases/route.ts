import { NextRequest, NextResponse } from "next/server";

import Aliases from "@/models/alias";
import { getDataFromToken } from "@/util/getDataFromToken";
import Employees from "@/models/employee";
import { connectDb } from "@/util/db";

export async function GET(req: NextRequest) {
  try {
    const token = await getDataFromToken(req);
    await connectDb();

    const userRole = String((token as any)?.role ?? "");
    const employeeId = (token as any)?.id as string | undefined;

    // Default organization is VacationSaga when missing; only HAdmin is restricted.
    let query: Record<string, unknown> = {};
    if (userRole === "HAdmin") {
      query.organization = "Holidaysera";
    }

    // Optional safety: ensure HAdmin really belongs to Holidaysera in DB
    if (userRole === "HAdmin" && employeeId && employeeId !== "test-superadmin") {
      const emp = await Employees.findById(employeeId).select("organization").lean();
      if (emp && (emp as any).organization && (emp as any).organization !== "Holidaysera") {
        return NextResponse.json({ aliases: [] }, { status: 200 });
      }
    }

    const aliases = await Aliases.find(query).lean();

    return NextResponse.json({ aliases }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
