import { Properties } from "@/models/property";
import { connectDb } from "@/util/db";
import { NextRequest, NextResponse } from "next/server";

connectDb();

export async function POST(req: NextRequest) {
  try {
    const { propertyId, dateRange } = await req.json();

    const property = await Properties.findById(propertyId);

    if (!property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    const startDate = new Date(dateRange.from);
    const endDate = new Date(dateRange.to);

    const st = startDate;
    while (st <= endDate) {
      const month = st.getMonth();
      const day = st.getDate();
      property.pricePerDay[month][day - 1] = -1;
      st.setDate(st.getDate() + 1);
    }

    property.markModified("pricePerDay");
    await property.save();

    return NextResponse.json(
      { message: "Dates blocked successfully" },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
