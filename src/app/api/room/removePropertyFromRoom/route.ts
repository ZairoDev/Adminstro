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

export async function PATCH(req: NextRequest) {
  const { roomId, propertyId } = await req.json();

  if (!propertyId) {
    return NextResponse.json(
      { error: "Property ID is required" },
      { status: 400 }
    );
  }

  let quickListing = false;

  try {
    let property = await Properties.findById(propertyId);

    if (!property) {
      quickListing = true;
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


    const room = await Rooms.findOneAndUpdate(
      { _id: roomId },
      {
        $pull: {
          showcaseProperties: { _id: new mongoose.Types.ObjectId(propertyId) },
        },
      },
      { new: true }
    );

    if (!room) {
      return NextResponse.json(
        { error: "Property can not be removed from room" },
        { status: 400 }
      );
    }

    const addedInRejectedProperties = await Rooms.findOneAndUpdate(
      { _id: roomId },
      { $push: { rejectedProperties: propertyObject } },
      { new: true }
    );

    await pusher.trigger(`room-${roomId}`, "propertyRemoved", propertyObject);

    return NextResponse.json(
      { message: "Property Removed from room" },
      { status: 200 }
    );
  } catch (err: unknown) {
    if (err instanceof Error) {
      return NextResponse.json({ error: `${err.message}` }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Unexpected error occurred" },
      { status: 500 }
    );
  }
}
