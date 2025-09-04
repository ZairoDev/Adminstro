import { NextResponse } from "next/server";
import Invoice from "@/models/invoice";
import { connectDb } from "@/util/db";

// GET /api/invoice → list all invoices
export async function GET() {
  try {
    await connectDb();
    const invoices = await Invoice.find().sort({ createdAt: -1 });
    return NextResponse.json(invoices);
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json(
      { message: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}
