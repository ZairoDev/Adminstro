import { NextRequest, NextResponse } from "next/server";
import { runExpenseRoute } from "@/modules/finance/expense-route";
import { expenseGridQuerySchema } from "@/modules/finance/schemas/expense.schema";
import { getExpenseGrid } from "@/modules/finance/services/expense-sheet.service";

export async function GET(request: NextRequest) {
  return runExpenseRoute(request, "GET /api/finance/expense-grid", "Failed to load the expense sheet", async () => {
    const parsed = expenseGridQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Invalid query", errors: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const data = await getExpenseGrid(parsed.data);
    return NextResponse.json({ success: true, data });
  });
}
