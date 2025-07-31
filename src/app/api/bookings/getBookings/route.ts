import { NextRequest, NextResponse } from "next/server";

import Bookings from "@/models/booking";

export async function POST(req: NextRequest) {
  try {
    const bookings = await Bookings.find().sort({ createdAt: -1 }).limit(1);
    const totalBookings = await Bookings.countDocuments();
    const totalPages = Math.ceil(totalBookings / 50);

    return NextResponse.json(
      { data: bookings, totalBookings, totalPages },
      { status: 200 }
    );
  } catch (err) {
    console.log("error in getting bookings: ", err);
    return NextResponse.json(
      { error: "Unable to get bookings" },
      { status: 401 }
    );
  }
}
