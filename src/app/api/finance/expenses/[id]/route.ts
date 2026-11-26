import { NextRequest, NextResponse } from "next/server";
import { parseJsonBody, runExpenseRoute } from "@/modules/finance/expense-route";
import { updateExpenseBodySchema } from "@/modules/finance/schemas/expense.schema";
import { deleteExpense, updateExpense } from "@/modules/finance/services/expense-sheet.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  return runExpenseRoute(request, "PATCH /api/finance/expenses/[id]", "Failed to update the expense", async () => {
    const { id } = await context.params;
    const body = await parseJsonBody(request, updateExpenseBodySchema);
    if (!body.ok) return body.response;
    const data = await updateExpense(id, body.data);
    return NextResponse.json({ success: true, data });
  });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return runExpenseRoute(request, "DELETE /api/finance/expenses/[id]", "Failed to delete the expense", async () => {
    const { id } = await context.params;
    await deleteExpense(id);
    return NextResponse.json({ success: true });
  });
}
