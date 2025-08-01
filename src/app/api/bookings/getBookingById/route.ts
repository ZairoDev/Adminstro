import { NextRequest, NextResponse } from "next/server";

import Bookings from "@/models/booking";

export async function POST(req: NextRequest) {
  const { bookingId } = await req.json();

  try {
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
  } catch (err) {
    console.log("error in fetching booking: ", err);
    return NextResponse.json(
      { error: "Unable to fetch booking" },
      { status: 401 }
    );
  }
}
