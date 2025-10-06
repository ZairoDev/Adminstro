import { NextResponse } from "next/server";
import Invoice from "@/models/invoice";
import { connectDb } from "@/util/db";

// GET /api/invoice/getInvoices?month=09&year=2025
export async function GET(req: Request) {
  try {
    await connectDb();

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    // console.log("month: ", month, "year: ", year);

    let query: any = {};

    if (month && year) {
      const start = new Date(Number(year), Number(month) - 1, 1);
      const end = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);
      // console.log("start: ", start, "end: ", end);

      query.createdAt = { $gte: start, $lte: end };
    } else if (year) {
      const start = new Date(Number(year), 0, 1);
      const end = new Date(Number(year), 11, 31, 23, 59, 59, 999);

      query.createdAt = { $gte: start, $lte: end };
    }

    const invoices = await Invoice.find(query).sort({ createdAt: -1 });

    return NextResponse.json({ data: invoices });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json(
      { message: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}
