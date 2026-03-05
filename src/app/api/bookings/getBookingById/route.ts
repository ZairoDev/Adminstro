import { NextRequest, NextResponse } from "next/server";

import { connectDb } from "@/util/db";
import Bookings from "@/models/booking";
import { getDataFromToken } from "@/util/getDataFromToken";
import "@/models/booking";
import "@/models/visit";
import "@/models/query";

export async function POST(req: NextRequest) {
  try {
    await getDataFromToken(req);
    await connectDb();
    const { bookingId } = await req.json();
    if (!bookingId) {
      return NextResponse.json(
        { error: "Booking ID is required" },
        { status: 400 }
      );
    }

    const booking = await Bookings.findById(bookingId)
      .populate("visit")
      .populate("lead");

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    return NextResponse.json({ data: booking }, { status: 200 });
  } catch (error: unknown) {
    const err = error as { status?: number; code?: string };
    if (err?.status === 401 || err?.code) {
      return NextResponse.json(
        { code: err.code || "AUTH_FAILED" },
        { status: err.status || 401 }
      );
    }
    console.log("error in fetching booking: ", error);
    return NextResponse.json(
      { error: "Unable to fetch booking" },
      { status: 500 }
    );
  }
}
