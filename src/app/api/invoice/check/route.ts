import { NextRequest, NextResponse } from "next/server";
import Invoice from "@/models/invoice";
import { connectDb } from "@/util/db";

// Mark this route as dynamic since it uses request.url
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectDb();

    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get("bookingId");

    if (!bookingId) {
      return NextResponse.json(
        { exists: false, message: "No bookingId provided" },
        { status: 400 }
      );
    }

    const existingInvoice = await Invoice.findOne({ bookingId }).lean();

    if (existingInvoice) {
      return NextResponse.json({
        exists: true,
        invoiceNumber: (existingInvoice as any).invoiceNumber,
        invoice: existingInvoice,
      });
    }

    return NextResponse.json({ exists: false });
  } catch (error) {
    console.error("Error checking invoice:", error);
    return NextResponse.json(
      { exists: false, error: "Failed to check invoice" },
      { status: 500 }
    );
  }
}
