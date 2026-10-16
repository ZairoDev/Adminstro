import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import {
  financeAuthErrorResponse,
  requireFinanceAccess,
} from "@/modules/finance/access";
import {
  salesSheetQuerySchema,
  updateSalesSheetRateSchema,
} from "@/modules/finance/schemas/payment.schema";
import {
  listSalesSheet,
  salesSheetCsv,
  updateSalesSheetExchangeRate,
} from "@/modules/finance/services/sales-sheet.service";

function statusFromError(error: unknown): number {
  if (
    error &&
    typeof error === "object" &&
    "status" in error &&
    typeof (error as { status: unknown }).status === "number"
  ) {
    return (error as { status: number }).status;
  }
  return 500;
}

export async function GET(request: NextRequest) {
  try {
    await requireFinanceAccess(request);
    await connectDb();

    const params = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = salesSheetQuerySchema.safeParse(params);
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

    const result = await listSalesSheet(parsed.data);
    if (parsed.data.format === "csv") {
      return new NextResponse(salesSheetCsv(result.data), {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="sales-sheet.csv"',
        },
      });
    }

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const auth = financeAuthErrorResponse(error);
    if (auth.status === 401 || auth.status === 403) {
      return NextResponse.json(auth.body, { status: auth.status });
    }
    console.error("GET /api/finance/sales-sheet", error);
    return NextResponse.json(
      { success: false, message: "Failed to load sales sheet" },
      { status: statusFromError(error) },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireFinanceAccess(request);
    await connectDb();

    const body: unknown = await request.json();
    const parsed = updateSalesSheetRateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid exchange rate",
          errors: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const result = await updateSalesSheetExchangeRate(parsed.data);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const auth = financeAuthErrorResponse(error);
    if (auth.status === 401 || auth.status === 403) {
      return NextResponse.json(auth.body, { status: auth.status });
    }
    const status = statusFromError(error);
    const message = error instanceof Error ? error.message : "Failed to save exchange rate";
    if (status !== 500) {
      return NextResponse.json({ success: false, message }, { status });
    }
    console.error("PATCH /api/finance/sales-sheet", error);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
