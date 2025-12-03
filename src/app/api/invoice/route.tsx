import { NextResponse } from "next/server";
import Invoice from "@/models/invoice";
import { connectDb } from "@/util/db";

// POST /api/invoice
export async function POST(req: Request) {
  try {
    await connectDb();

    const body = await req.json();

    // Check if an invoice already exists for this booking
    if (body.bookingId) {
      const existingInvoice = await Invoice.findOne({ bookingId: body.bookingId }).lean();
      if (existingInvoice) {
        return NextResponse.json(
          {
            success: true,
            message: "Invoice already exists for this booking",
            invoice: existingInvoice,
            invoiceNumber: (existingInvoice as any).invoiceNumber,
            alreadyExists: true,
          },
          { status: 200 }
        );
      }
    }

    // If invoiceNumber is missing, auto-generate one
    if (!body.invoiceNumber) {
      // Get the last invoice to determine the next invoice number
      const lastInvoice = await Invoice.findOne()
        .sort({ createdAt: -1 })
        .select("invoiceNumber")
        .lean() as { invoiceNumber?: string } | null;

      let nextInvoiceNumber = "ZI-00001";

      if (lastInvoice && lastInvoice.invoiceNumber) {
        // Extract the number from the last invoice (e.g., "ZI-00123" -> 123)
        const match = lastInvoice.invoiceNumber.match(/ZI-(\d+)/);
        if (match && match[1]) {
          const lastNumber = parseInt(match[1], 10);
          const nextNumber = lastNumber + 1;
          // Pad with zeros to maintain 5-digit format
          nextInvoiceNumber = `ZI-${String(nextNumber).padStart(5, "0")}`;
        }
      }

      body.invoiceNumber = nextInvoiceNumber;
    }

    // Save invoice to MongoDB
    const invoice = await Invoice.create(body);

    return NextResponse.json(
      { 
        success: true,
        message: "Invoice saved successfully", 
        invoice,
        invoiceNumber: invoice.invoiceNumber 
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error saving invoice:", error);

    if (error.code === 11000) {
      return NextResponse.json(
        { message: "Duplicate invoice number", error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Failed to save invoice", error },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await connectDb();
    const count = await Invoice.countDocuments();
    return NextResponse.json({ count });
  } catch (error) {
    console.error("Error counting invoices:", error);
    return NextResponse.json(
      { message: "Failed to count invoices" },
      { status: 500 }
    );
  }
}
