import { NextRequest, NextResponse } from "next/server";

import { getDataFromToken } from "@/util/getDataFromToken";
import Bookings from "@/models/booking";

export async function POST(req: NextRequest) {
  const bookingData = await req.json();
  const token = await getDataFromToken(req);

  const newBookingData = {
    ...bookingData,
    createdBy: token.email,
  };

  try {
    await Bookings.create(newBookingData);
    return NextResponse.json(
      { message: "Booking added successfully" },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: "Unable to add booking" },
      { status: 401 }
    );
  }
}
