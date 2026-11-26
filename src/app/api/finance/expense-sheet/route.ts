import { NextRequest, NextResponse } from "next/server";
import { runExpenseRoute } from "@/modules/finance/expense-route";
import { expenseSheetQuerySchema } from "@/modules/finance/schemas/expense.schema";
import { getExpenseSheet } from "@/modules/finance/services/expense-sheet.service";

export async function GET(request: NextRequest) {
  return runExpenseRoute(request, "GET /api/finance/expense-sheet", "Failed to load the expense sheet", async () => {
    const parsed = expenseSheetQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Invalid query", errors: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const data = await getExpenseSheet(parsed.data);
    return NextResponse.json({ success: true, data });
  });
}
