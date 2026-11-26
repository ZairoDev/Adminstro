import { NextRequest, NextResponse } from "next/server";
import { parseJsonBody, runExpenseRoute } from "@/modules/finance/expense-route";
import { monthParamSchema, recurringMonthBodySchema } from "@/modules/finance/schemas/expense.schema";
import { setRecurringExpenseMonth } from "@/modules/finance/services/expense-sheet.service";

type RouteContext = { params: Promise<{ id: string; month: string }> };

export async function PUT(request: NextRequest, context: RouteContext) {
  return runExpenseRoute(
    request,
    "PUT /api/finance/recurring-expenses/[id]/months/[month]",
    "Failed to update this month",
    async () => {
      const { id, month } = await context.params;
      const monthParsed = monthParamSchema.safeParse(month);
      if (!monthParsed.success) {
        return NextResponse.json({ success: false, message: "Use a month like 2026-11" }, { status: 400 });
      }
      const body = await parseJsonBody(request, recurringMonthBodySchema);
      if (!body.ok) return body.response;
      const data = await setRecurringExpenseMonth(id, monthParsed.data, body.data);
      return NextResponse.json({ success: true, data });
    },
  );
}
