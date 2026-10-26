import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import {
  financeAuthErrorResponse,
  requireFinanceAccess,
} from "@/modules/finance/access";
import { updateSalaryBodySchema } from "@/modules/finance/schemas/salary.schema";
import {
  EmployeeSalaryError,
  updateEmployeeGrossSalary,
} from "@/modules/finance/services/salary.service";

type RouteContext = { params: Promise<{ employeeId: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const actor = await requireFinanceAccess(request);
    await connectDb();

    const { employeeId } = await context.params;
    const body: unknown = await request.json();
    const parsed = updateSalaryBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Enter a valid gross salary",
          errors: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const result = await updateEmployeeGrossSalary({
      employeeId,
      gross: parsed.data.gross,
      updatedById: actor.id,
      updatedByName: actor.name,
    });

    return NextResponse.json({
      success: true,
      changed: result.changed,
      data: result.employee,
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
    console.error("PATCH /api/finance/salaries/[employeeId]", error);
    return NextResponse.json(
      { success: false, message: "Failed to update salary" },
      { status: 500 },
    );
  }
}
