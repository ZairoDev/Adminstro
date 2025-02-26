import Pusher from "pusher";
import { NextRequest, NextResponse } from "next/server";

import Query from "@/models/query";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";

connectDb();

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

export async function POST(req: NextRequest) {
  const token = await getDataFromToken(req);
  try {
    const {
      date,
      name,
      email,
      phoneNo,
      duration,
      startDate,
      endDate,
      area,
      guest,
      budget,
      noOfBeds,
      location,
      bookingTerm,
      zone,
      billStatus,
      typeOfProperty,
      propertyType,
      priority,
      leadQualityByCreator,
    } = await req.json();

    // Check if a query with the same phone number already exists
    const existingQuery = await Query.findOne({ phoneNo });

    let numberOfDays = 61;
    if (existingQuery) {
      const today = new Date();
      const leadCreatedDate = existingQuery.createdAt;

      numberOfDays = Math.floor(
        (today.getTime() - leadCreatedDate.getTime()) / (24 * 60 * 60 * 1000)
      );
    }

    // console.log("number of days: ", numberOfDays, area, existingQuery.area);

    if (existingQuery && numberOfDays < 60 && existingQuery.area === area) {
      return NextResponse.json({ error: "Phone number already exists" }, { status: 400 });
    }

    // Create a new query if phone number is unique
    const newQuery = await Query.create({
      name,
      email,
      date,
      startDate,
      endDate,
      phoneNo,
      duration,
      area,
      guest,
      budget,
      noOfBeds,
      location: location.toLowerCase(),
      bookingTerm,
      zone,
      billStatus,
      typeOfProperty,
      propertyType,
      priority,
      leadQualityByCreator,
      createdBy: token.email,
    });

    const triggerQuery = `new-query-${location.trim().toLowerCase()}`;

    // Trigger Pusher event
    await pusher.trigger("queries", triggerQuery, {
      _id: newQuery._id,
      date: newQuery.date,
      name: newQuery.name,
      startDate: newQuery.startDate,
      endDate: newQuery.endDate,
      phoneNo: newQuery.phoneNo,
      duration: newQuery.duration,
      area: newQuery.area,
      guest: newQuery.guest,
      budget: newQuery.budget,
      noOfBeds: newQuery.noOfBeds,
      location: newQuery.location,
      bookingTerm: newQuery.bookingTerm,
      zone: newQuery.zone,
      billStatus: newQuery.billStatus,
      typeOfProperty: newQuery.typeOfProperty,
      propertyType: newQuery.propertyType,
      priority: newQuery.priority,
      leadQualityByCreator: newQuery.leadQualityByCreator,
    });

    return NextResponse.json({ success: true, data: newQuery }, { status: 201 });
  } catch (error: any) {
    console.log(error);

    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, error: "Phone number already exists" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
