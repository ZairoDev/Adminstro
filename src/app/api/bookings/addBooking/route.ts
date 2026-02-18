import { NextRequest, NextResponse } from "next/server";

import { getDataFromToken } from "@/util/getDataFromToken";
import Bookings from "@/models/booking";
import Query from "@/models/query";

export async function POST(req: NextRequest) {
  const bookingData = await req.json();
  const token = await getDataFromToken(req);

  const newBookingData = {
    ...bookingData,
    createdBy: token.email,
  };

  // console.log("new booking data: ", newBookingData);

  try {
    const created = await Bookings.create(newBookingData);

    // If booking references a lead, mark that lead as closed and attach bookingId
    try {
      if (created?.lead) {
        await Query.findByIdAndUpdate(created.lead, {
          $set: { leadStatus: "closed", bookingId: created._id },
        });
      }
    } catch (err) {
      console.error("Failed to update lead after booking creation", err);
    }

    return NextResponse.json(
      { message: "Booking added successfully", booking: created },
      { status: 201 }
    );
  } catch (err) {
    console.log("error in adding booking: ", err);
    return NextResponse.json(
      { error: "Unable to add booking" },
      { status: 401 }
    );
  }
}
