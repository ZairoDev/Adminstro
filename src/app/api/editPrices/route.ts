import { Property } from "@/models/listing";
import { connectDb } from "@/util/db";
import { NextRequest, NextResponse } from "next/server";

connectDb();

export async function POST(req: NextRequest) {
  const reqBody = await req.json();
  const { propertyId, portion, price, dateRange } = reqBody;

  if (!propertyId || !portion || !price) {
    return NextResponse.json(
      { error: "All fields are required" },
      { status: 400 }
    );
  }

  try {
    const property = await Property.findById(propertyId);

    if (!property) {
      return NextResponse.json(
        { error: "Invalid Property Id" },
        { status: 400 }
      );
    }

    console.log(property);
    const startDate = new Date(dateRange.from);
    const endDate = new Date(dateRange.to);

    const st = startDate;
    while (st <= endDate) {
      const month = st.getMonth();
      const day = st.getDate();
      property.pricePerDay[portion][month][day - 1] = price;
      st.setDate(st.getDate() + 1);
    }

		// ! markModified is used when the field is nested inside an object
    property.markModified(`pricePerDay.${portion}`);
    await property.save();

    return NextResponse.json(
      { message: "Prices updated successfully" },
      { status: 200 }
    );
  } catch (err: any) {
    console.log("error in updating prices: ", err);
    return NextResponse.json(
      { error: "Prices could not be updated" },
      { status: 500 }
    );
  }
}
