import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { requireFinanceAccess, financeAuthErrorResponse } from "@/lib/finance/auth";
import { z } from "zod";
import { getBookingInvoiceContext } from "@/services/finance/bookingLedgerService";

const querySchema = z.object({
  bookingId: z.string().min(1, "bookingId is required"),
});

export async function GET(request: NextRequest) {
  try {
    await requireFinanceAccess(request);
    await connectDb();

    const parsed = querySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams.entries()),
    );
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "bookingId is required", errors: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const context = await getBookingInvoiceContext(parsed.data.bookingId);
    return NextResponse.json({
      success: true,
      guests: context.guests,
      booking: {
        bookingId: context.bookingId,
        propertyName: context.propertyName,
        propertyAddress: context.propertyAddress,
        checkIn: context.checkIn?.toISOString() ?? null,
        checkOut: context.checkOut?.toISOString() ?? null,
      },
    });
  } catch (error) {
    const authErr = financeAuthErrorResponse(error);
    if (authErr.status === 401 || authErr.status === 403) {
      return NextResponse.json(authErr.body, { status: authErr.status });
    }
    const message = error instanceof Error ? error.message : "Failed to fetch guests";
    const status = message.includes("not found") ? 404 : 500;
    console.error("GET /api/finance/booking-guests", error);
    return NextResponse.json({ success: false, message }, { status });
  }
}
