import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { financeAuthErrorResponse, requireFinanceAccess } from "@/modules/finance/access";
import { listSalariesQuerySchema } from "@/modules/finance/schemas/salary.schema";
import { updateSalarySheetBodySchema } from "@/modules/finance/schemas/salary-sheet.schema";
import { EmployeeSalaryError } from "@/modules/finance/services/salary.service";
import {
  getSalarySheet,
  updateSalarySheetAdjustment,
} from "@/modules/finance/services/salary-sheet.service";

export async function GET(request: NextRequest) {
  try {
    await requireFinanceAccess(request);
    await connectDb();
    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = listSalariesQuerySchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Invalid query", errors: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const data = await getSalarySheet(parsed.data);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const auth = financeAuthErrorResponse(error);
    if (auth.status === 401 || auth.status === 403) {
      return NextResponse.json(auth.body, { status: auth.status });
    }
    if (error instanceof EmployeeSalaryError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status });
    }
    console.error("GET /api/finance/salary-sheet", error);
    return NextResponse.json({ success: false, message: "Failed to load the salary sheet" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireFinanceAccess(request);
    await connectDb();
    const body: unknown = await request.json();
    const parsed = updateSalarySheetBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Enter an amount of zero or more", errors: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const data = await updateSalarySheetAdjustment(parsed.data);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const auth = financeAuthErrorResponse(error);
    if (auth.status === 401 || auth.status === 403) {
      return NextResponse.json(auth.body, { status: auth.status });
    }
    if (error instanceof EmployeeSalaryError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status });
    }
    console.error("PATCH /api/finance/salary-sheet", error);
    return NextResponse.json({ success: false, message: "Failed to save this amount" }, { status: 500 });
  }
}
