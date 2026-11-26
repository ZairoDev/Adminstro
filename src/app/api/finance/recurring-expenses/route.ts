import { NextRequest, NextResponse } from "next/server";
import { parseJsonBody, runExpenseRoute } from "@/modules/finance/expense-route";
import { createRecurringExpenseBodySchema } from "@/modules/finance/schemas/expense.schema";
import { createRecurringExpense } from "@/modules/finance/services/expense-sheet.service";

export async function POST(request: NextRequest) {
  return runExpenseRoute(
    request,
    "POST /api/finance/recurring-expenses",
    "Failed to add the recurring expense",
    async (actor) => {
      const body = await parseJsonBody(request, createRecurringExpenseBodySchema);
      if (!body.ok) return body.response;
      const data = await createRecurringExpense(body.data, { id: actor.id });
      return NextResponse.json({ success: true, data }, { status: 201 });
    },
  );
}
