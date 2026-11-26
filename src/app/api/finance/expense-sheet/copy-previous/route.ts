import { NextRequest, NextResponse } from "next/server";
import { parseJsonBody, runExpenseRoute } from "@/modules/finance/expense-route";
import { copyPreviousBodySchema } from "@/modules/finance/schemas/expense.schema";
import { copyPreviousMonthExpenses } from "@/modules/finance/services/expense-sheet.service";

export async function POST(request: NextRequest) {
  return runExpenseRoute(
    request,
    "POST /api/finance/expense-sheet/copy-previous",
    "Failed to copy last month's expenses",
    async (actor) => {
      const body = await parseJsonBody(request, copyPreviousBodySchema);
      if (!body.ok) return body.response;
      const data = await copyPreviousMonthExpenses(body.data, { id: actor.id });
      return NextResponse.json({ success: true, data });
    },
  );
}
