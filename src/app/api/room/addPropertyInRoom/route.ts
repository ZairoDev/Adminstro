import { Properties } from "@/models/property";
import { quicklisting } from "@/models/quicklisting";
import Rooms from "@/models/room";
import { connectDb } from "@/util/db";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import Pusher from "pusher";

connectDb();

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

export async function POST(req: NextRequest) {
  const { roomId, propertyId } = await req.json();

  console.log("room: ", roomId, propertyId);

  try {
    let property = await Properties.findById(propertyId);

    if (!property) {
      property = await quicklisting.findById(propertyId);
    }

    if (!property) {
      return NextResponse.json(
        { error: "Property not found" },
        { status: 404 }
      );
    }

    const Images = [
      property?.propertyCoverFileUrl ? property.propertyCoverFileUrl : "",
      ...(property.propertyImages ? property.propertyImages : []),
      ...(property.pictures ? property.propertyPictures : []),
    ]
      .filter((item) => item != "")
      .slice(0, 5);

    const propertyObject = {
      _id: property._id,
      propertyImages: Images,
      VSID: property?.VSID ? property.VSID : "xxxx",
      QID: property?.QID ? property?.QID : "xxxx",
      price: property.basePrice,
      postalCode: property?.postalCode ? property?.postalCode : "xxxx",
      city: property?.city ? property?.city : "xxxx",
      state: property?.state ? property?.state : "xxxx",
      country: property?.country ? property?.country : "xxxx",
      isVisit: property?.isVisit ? property?.isVisit : false,
      isViewed: property?.isViewed ? property.isViewed : false,
      visitSchedule: property?.visitSchedule ? property?.visitSchedule : "",
    };

    const room = await Rooms.findByIdAndUpdate(
      { _id: roomId },
      { $push: { showcaseProperties: propertyObject } }
    );

    await pusher.trigger(`room-${roomId}`, "showcasePropertyAdded", {
      data: propertyObject,
    });
    return NextResponse.json({ message: "Property Added " }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Unable to add Property in Room" },
      { status: 400 }
    );
  }
}
