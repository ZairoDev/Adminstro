import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { requireFinanceAccess, financeAuthErrorResponse } from "@/lib/finance/auth";
import { generateInvoiceBodySchema } from "@/schemas/financePayment.schema";
import { generateInvoice } from "@/services/finance/invoiceGenerationService";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireFinanceAccess(request);
    await connectDb();

    const body = await request.json();
    const parsed = generateInvoiceBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Invalid body", errors: parsed.error.flatten() },
        { status: 400 },
      );
    }

    if (!parsed.data.paymentId && !parsed.data.paymentLinkId) {
      return NextResponse.json(
        { success: false, message: "paymentId or paymentLinkId is required" },
        { status: 400 },
      );
    }

    const result = await generateInvoice(parsed.data, {
      id: auth.id ?? "unknown",
      name: auth.name ?? auth.email,
    });

    return NextResponse.json({
      success: true,
      payment: { invoiceStatus: result.payment.invoiceStatus, invoiceNumbers: result.payment.invoiceNumbers },
      invoices: result.invoices,
    });
  } catch (error) {
    const authErr = financeAuthErrorResponse(error);
    if (authErr.status === 401 || authErr.status === 403) {
      return NextResponse.json(authErr.body, { status: authErr.status });
    }
    const e = error as { status?: number; code?: string; message?: string };
    const status = e.status ?? (e.message?.includes("not found") ? 404 : 500);
    console.error("POST /api/finance/generate-invoice", error);
    return NextResponse.json(
      { success: false, code: e.code, message: e.message ?? "Failed to generate invoice" },
      { status },
    );
  }
}
