import Bookings from "@/models/booking";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";

export async function PATCH(req: NextRequest) {
  try {
    // Authenticate request
    let auth: any;
    try {
      auth = await getDataFromToken(req);
    } catch (err: any) {
      const status = err?.status ?? 401;
      const code = err?.code ?? "AUTH_FAILED";
      return NextResponse.json(
        { success: false, code, message: "Unauthorized" },
        { status },
      );
    }

    const { paymentStatus, bookingId } = await req.json();

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
      { status: 500 }
    );
  }
}
