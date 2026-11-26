import { NextRequest, NextResponse } from "next/server";
import { parseJsonBody, runExpenseRoute } from "@/modules/finance/expense-route";
import { createExpenseBodySchema } from "@/modules/finance/schemas/expense.schema";
import { createExpense } from "@/modules/finance/services/expense-sheet.service";

export async function POST(request: NextRequest) {
  return runExpenseRoute(request, "POST /api/finance/expenses", "Failed to add the expense", async (actor) => {
    const body = await parseJsonBody(request, createExpenseBodySchema);
    if (!body.ok) return body.response;
    const data = await createExpense(body.data, { id: actor.id });
    return NextResponse.json({ success: true, data }, { status: 201 });
  });
}
