import { Properties } from "@/models/property";
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

  const property = await Properties.findById(propertyId);

  const Images = [
    property.propertyCoverFileUrl,
    ...(property.pictures ? property.propertyPictures : []),
    ...(property.propertyImages ? property.propertyImages : []),
  ]
    .filter((item) => item != "")
    .slice(0, 5);
  const propertyObject = {
    _id: property._id,
    propertyImages: Images,
    VSID: property.VSID,
    price: property.basePrice,
    postalCode: property?.postalCode,
    city: property?.city,
    state: property?.state,
    country: property?.country,
  };

  try {
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
      console.log(
        "Error in deleting property from room: ",
        err.name,
        err.message,
        err.cause,
        err.stack
      );
      return NextResponse.json({ error: `${err.message}` }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Unexpected error occurred" },
      { status: 500 }
    );
  }
}
