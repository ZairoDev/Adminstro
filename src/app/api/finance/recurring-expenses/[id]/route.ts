import { NextRequest, NextResponse } from "next/server";
import { parseJsonBody, runExpenseRoute } from "@/modules/finance/expense-route";
import { updateRecurringExpenseBodySchema } from "@/modules/finance/schemas/expense.schema";
import {
  deleteRecurringExpense,
  updateRecurringExpense,
} from "@/modules/finance/services/expense-sheet.service";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  return runExpenseRoute(
    request,
    "PATCH /api/finance/recurring-expenses/[id]",
    "Failed to update the recurring expense",
    async () => {
      const { id } = await context.params;
      const body = await parseJsonBody(request, updateRecurringExpenseBodySchema);
      if (!body.ok) return body.response;
      await updateRecurringExpense(id, body.data);
      return NextResponse.json({ success: true });
    },
  );
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return runExpenseRoute(
    request,
    "DELETE /api/finance/recurring-expenses/[id]",
    "Failed to delete the recurring expense",
    async () => {
      const { id } = await context.params;
      await deleteRecurringExpense(id);
      return NextResponse.json({ success: true });
    },
  );
}
