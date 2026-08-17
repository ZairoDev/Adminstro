import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import {
  financeAuthErrorResponse,
  requireFinanceAccess,
} from "@/lib/finance/auth";
import { mapSuggestionsQuerySchema } from "@/schemas/financePayment.schema";
import { suggestGuestsForPayment } from "@/services/finance/financePaymentService";

export async function GET(request: NextRequest) {
  try {
    await requireFinanceAccess(request);
    await connectDb();

    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = mapSuggestionsQuerySchema.safeParse(params);
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

    if (
      !parsed.data.paymentId &&
      !parsed.data.paymentLinkId &&
      !parsed.data.search
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "paymentId, paymentLinkId, or search is required",
        },
        { status: 400 },
      );
    }

    const result = await suggestGuestsForPayment(parsed.data);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const auth = financeAuthErrorResponse(error);
    if (auth.status === 401 || auth.status === 403) {
      return NextResponse.json(auth.body, { status: auth.status });
    }
    console.error("GET /api/finance/map-suggestions", error);
    return NextResponse.json(
      { success: false, message: "Failed to load suggestions" },
      { status: 500 },
    );
  }
}
