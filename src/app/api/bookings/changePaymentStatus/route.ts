import Bookings from "@/models/booking";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest) {
  const { paymentStatus, bookingId } = await req.json();

  try {
    if (!paymentStatus || !bookingId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    await Bookings.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(bookingId) },
      { "payment.status": paymentStatus }
    );

    return NextResponse.json(
      { message: "Payment status updated" },
      { status: 200 }
    );
  } catch (err) {
    console.log("errr: ", err);
    return NextResponse.json(
      { error: "Unable to update payment status" },
      { status: 401 }
    );
  }
}
