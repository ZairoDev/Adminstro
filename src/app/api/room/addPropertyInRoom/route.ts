import { Properties } from "@/models/property";
import Rooms from "@/models/room";
import { connectDb } from "@/util/db";
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

  try {
    const property = await Properties.findById(propertyId);

    if (!property) {
      return NextResponse.json(
        { error: "Property does not exist" },
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
      isFavourite: false,
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
