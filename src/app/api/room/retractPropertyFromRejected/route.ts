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

export async function POST(req: NextRequest) {
  try {
    const { roomId, propertyId } = await req.json();

    if (!roomId || !propertyId) {
      return NextResponse.json(
        { error: "Invalid room id or property id" },
        { status: 400 }
      );
    }

    const property = await Properties.findById(propertyId);
    if (!property) {
      return NextResponse.json(
        { error: "Invalid property id" },
        { status: 400 }
      );
    }

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

    const removeFromRejected = await Rooms.updateOne(
      { _id: roomId },
      {
        $pull: {
          rejectedProperties: { _id: new mongoose.Types.ObjectId(propertyId) },
        },
      }
    );

    const addToShowcaseAgain = await Rooms.updateOne(
      { _id: roomId },
      { $push: { showcaseProperties: propertyObject } }
    );

    await pusher.trigger(`room-${roomId}`, "retractedProperty", propertyObject);

    return NextResponse.json(
      { message: "Property retracted successfully" },
      { status: 200 }
    );
  } catch (err: unknown) {
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
  }
}
