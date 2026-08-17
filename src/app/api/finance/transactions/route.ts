import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import {
  financeAuthErrorResponse,
  requireFinanceAccess,
} from "@/lib/finance/auth";
import { listTransactionsQuerySchema } from "@/schemas/financePayment.schema";
import { listTransactions } from "@/services/finance/financePaymentService";

export async function GET(request: NextRequest) {
  try {
    await requireFinanceAccess(request);
    await connectDb();

    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = listTransactionsQuerySchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid query",
          errors: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const result = await listTransactions(parsed.data);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const auth = financeAuthErrorResponse(error);
    if (auth.status === 401 || auth.status === 403) {
      return NextResponse.json(auth.body, { status: auth.status });
    }
    console.error("GET /api/finance/transactions", error);
    return NextResponse.json(
      { success: false, message: "Failed to list transactions" },
      { status: 500 },
    );
  }
}
