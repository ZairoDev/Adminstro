import { NextResponse } from "next/server";
import Invoice from "@/models/invoice";
import { connectDb } from "@/util/db";

// POST /api/invoice
export async function POST(req: Request) {
  try {
    await connectDb();

    const body = await req.json();
    console.log("body: ", body);
    // If invoiceNumber is missing, auto-generate one
    if (!body.invoiceNumber){
      const count = await Invoice.countDocuments();
      body.invoiceNumber = `ZI-${count + 1}`;}
    console.log("invoiceNo: ", body)

    // Save invoice to MongoDB
    const invoice = await Invoice.create(body);

    return NextResponse.json(
      { message: "Invoice saved successfully", invoice },
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
