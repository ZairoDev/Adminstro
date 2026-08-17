import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { requireFinanceAccess, financeAuthErrorResponse } from "@/lib/finance/auth";
import { sendInvoiceBodySchema } from "@/schemas/financePayment.schema";
import { sendInvoices } from "@/services/finance/invoiceSendService";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireFinanceAccess(request);
    await connectDb();

    const body = await request.json();
    const parsed = sendInvoiceBodySchema.safeParse(body);
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

    const { results } = await sendInvoices(parsed.data, {
      id: auth.id ?? "unknown",
      name: auth.name ?? auth.email,
    });

    const anyFailed = results.some((r) => r.status === "failed");
    return NextResponse.json(
      {
        success: !anyFailed,
        results,
        message: anyFailed
          ? "Some invoices failed to send — see results for details"
          : `${results.filter((r) => r.status === "sent").length} invoice(s) sent`,
      },
      { status: anyFailed ? 207 : 200 },
    );
  } catch (error) {
    const authErr = financeAuthErrorResponse(error);
    if (authErr.status === 401 || authErr.status === 403) {
      return NextResponse.json(authErr.body, { status: authErr.status });
    }
    const e = error as { status?: number; code?: string; message?: string };
    const status = e.status ?? 500;
    console.error("POST /api/finance/send-invoice", error);
    return NextResponse.json(
      { success: false, code: e.code, message: e.message ?? "Failed to send invoices" },
      { status },
    );
  }
}
