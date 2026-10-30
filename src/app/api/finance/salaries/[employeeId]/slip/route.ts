import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import {
  financeAuthErrorResponse,
  requireFinanceAccess,
} from "@/modules/finance/access";
import {
  EmployeeSalaryError,
  getEmployeeSalarySlip,
} from "@/modules/finance/services/salary.service";
import { buildSalarySlipPdf } from "@/modules/finance/services/salary-slip-pdf.service";
import { recordPayrollSnapshot } from "@/modules/attendance/service";

type RouteContext = { params: Promise<{ employeeId: string }> };

function slipFileName(slipNumber: string): string {
  return `${slipNumber.replace(/[^\w.-]+/g, "-")}.pdf`;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const actor = await requireFinanceAccess(request);
    await connectDb();
    const { employeeId } = await context.params;
    const month = request.nextUrl.searchParams.get("month") ?? "";
    const lossOfPayDays = request.nextUrl.searchParams.get("lossOfPayDays") ?? "0";
    const slip = await getEmployeeSalarySlip(employeeId, month, lossOfPayDays);
    try {
      await recordPayrollSnapshot({
        employeeId,
        monthKey: slip.monthKey,
        lossOfPayDays: slip.lossOfPayDays,
        slipNumber: slip.slipNumber,
        generatedBy: actor.id ?? null,
      });
    } catch (snapshotError) {
      console.error("attendance payroll snapshot", snapshotError);
    }
    const pdf = await buildSalarySlipPdf(slip);

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${slipFileName(slip.slipNumber)}"`,
        "Content-Length": String(pdf.byteLength),
      },
    });
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
    console.error("GET /api/finance/salaries/[employeeId]/slip", error);
    return NextResponse.json(
      { success: false, message: "Failed to generate the salary slip" },
      { status: 500 },
    );
  }
}
