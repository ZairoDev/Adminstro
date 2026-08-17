import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { requireFinanceAccess, financeAuthErrorResponse } from "@/lib/finance/auth";
import FinanceInvoice from "@/models/financeInvoice";
import { generateFinanceInvoicePdf } from "@/services/finance/financeInvoicePdf";

type RouteContext = { params: Promise<{ invoiceNumber: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireFinanceAccess(request);
    await connectDb();

    const { invoiceNumber } = await context.params;
    const inv = await FinanceInvoice.findOne({ invoiceNumber }).lean();

    if (!inv) {
      return NextResponse.json({ success: false, message: "Invoice not found" }, { status: 404 });
    }

    const doc = inv as typeof inv & {
      guestName?: string;
      guestEmail?: string;
      guestPhone?: string;
      bookingId?: string;
      propertyName?: string;
      propertyAddress?: string;
      checkIn?: Date;
      checkOut?: Date;
      classification: "complete" | "partial" | "split";
      amountBilled: number;
      currency: string;
      discountGiven?: number;
      pendingAmount?: number;
      splitTotalAmount?: number;
      notes?: string;
      createdAt: Date;
    };

    const pdfBuffer = await generateFinanceInvoicePdf({
      invoiceNumber: doc.invoiceNumber,
      invoiceDate: doc.createdAt,
      classification: doc.classification,
      guestName: doc.guestName ?? "—",
      guestEmail: doc.guestEmail ?? "",
      guestPhone: doc.guestPhone,
      bookingId: doc.bookingId,
      propertyName: doc.propertyName,
      propertyAddress: doc.propertyAddress,
      checkIn: doc.checkIn,
      checkOut: doc.checkOut,
      amountBilled: doc.amountBilled,
      currency: doc.currency,
      discountGiven: doc.discountGiven,
      pendingAmount: doc.pendingAmount,
      splitTotalAmount: doc.splitTotalAmount,
      notes: doc.notes,
    });

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
