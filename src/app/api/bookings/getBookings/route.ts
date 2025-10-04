import { NextRequest, NextResponse } from "next/server";
import Bookings from "@/models/booking";
import { connectDb } from "@/util/db";

export async function POST(req: NextRequest) {
  connectDb();
  try {
    const body = await req.json();
    const page = body.page ? parseInt(body.page) : 1;
    const limit = 50; // fixed per page
    const skip = (page - 1) * limit;

    const bookings = await Bookings.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalBookings = await Bookings.countDocuments();
    const totalPages = Math.ceil(totalBookings / limit);

    return NextResponse.json(
      { data: bookings, totalBookings, totalPages },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error in getting bookings:", err);
    return NextResponse.json(
      { error: "Unable to get bookings" },
      { status: 500 }
    );
  }
}
