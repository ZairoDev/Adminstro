import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import {
  financeAuthErrorResponse,
  requireFinanceAccess,
} from "@/lib/finance/auth";
import { getTransactionByPublicId } from "@/services/finance/financePaymentService";
import { listWebhookLogsForPayment } from "@/services/finance/webhookLogService";
import { getInvoicesForPayment } from "@/services/finance/invoiceGenerationService";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireFinanceAccess(request);
    await connectDb();

    const { id } = await context.params;
    const type = request.nextUrl.searchParams.get("type");

    const payment =
      type === "link"
        ? await getTransactionByPublicId({ paymentLinkId: id })
        : await getTransactionByPublicId({ paymentId: id });

    // Fallback: try the other identifier if first lookup fails
    const resolved =
      payment ??
      (type === "link"
        ? await getTransactionByPublicId({ paymentId: id })
        : await getTransactionByPublicId({ paymentLinkId: id }));

    if (!resolved) {
      return NextResponse.json(
        { success: false, message: "Transaction not found" },
        { status: 404 },
      );
    }

    const [webhookHistory, invoices] = await Promise.all([
      listWebhookLogsForPayment({
        paymentId: resolved.paymentId,
        paymentLinkId: resolved.paymentLinkId,
      }),
      getInvoicesForPayment({
        paymentId: resolved.paymentId,
        paymentLinkId: resolved.paymentLinkId,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: resolved,
      webhookHistory,
      invoices,
    });
  } catch (error) {
    const auth = financeAuthErrorResponse(error);
    if (auth.status === 401 || auth.status === 403) {
      return NextResponse.json(auth.body, { status: auth.status });
    }
    console.error("GET /api/finance/transaction/[id]", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch transaction" },
      { status: 500 },
    );
  }
}
