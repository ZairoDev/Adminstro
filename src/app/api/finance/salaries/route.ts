import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import {
  financeAuthErrorResponse,
  requireFinanceAccess,
} from "@/modules/finance/access";
import { listSalariesQuerySchema } from "@/modules/finance/schemas/salary.schema";
import { listEmployeeSalaries, EmployeeSalaryError } from "@/modules/finance/services/salary.service";

export async function GET(request: NextRequest) {
  try {
    await requireFinanceAccess(request);
    await connectDb();

    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = listSalariesQuerySchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid query",
          errors: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const data = await listEmployeeSalaries(parsed.data);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const auth = financeAuthErrorResponse(error);
    if (auth.status === 401 || auth.status === 403) {
      return NextResponse.json(auth.body, { status: auth.status });
    }
    if (error instanceof EmployeeSalaryError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: error.status },
      );
    }
    console.error("GET /api/finance/salaries", error);
    return NextResponse.json(
      { success: false, message: "Failed to load salaries" },
      { status: 500 },
    );
  }
}
