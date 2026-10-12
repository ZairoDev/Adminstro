import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { requireFinanceAccess, financeAuthErrorResponse } from "@/modules/finance/access";
import { loadFinanceInvoicePdf } from "@/modules/finance/services/invoice-pdf.service";

type RouteContext = { params: Promise<{ invoiceNumber: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireFinanceAccess(request);
    await connectDb();

    const { invoiceNumber } = await context.params;
    const pdfBuffer = await loadFinanceInvoicePdf(invoiceNumber);

    if (!pdfBuffer) {
      return NextResponse.json({ success: false, message: "Invoice not found" }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="invoice-${invoiceNumber}.pdf"`,
        "Content-Length": String(pdfBuffer.length),
      },
    });
  } catch (error) {
    const authErr = financeAuthErrorResponse(error);
    if (authErr.status === 401 || authErr.status === 403) {
      return NextResponse.json(authErr.body, { status: authErr.status });
    }
    console.error("GET /api/finance/invoice/[invoiceNumber]/pdf", error);
    return NextResponse.json({ success: false, message: "Failed to generate PDF" }, { status: 500 });
  }
}
