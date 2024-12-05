import { NextResponse } from "next/server";
import Pusher from "pusher";
import Query from "@/models/query";
import { connectDb } from "@/util/db";

connectDb();

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

export async function POST(req: Request) {
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
      location,
      bookingTerm,
      zone,
      billStatus,
      typeOfProperty,
      propertyType,
      priority,
      leadQualityByCreator,
    });

    await pusher.trigger("queries", "new-query", {
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
    return NextResponse.json(
      { success: true, data: newQuery },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
