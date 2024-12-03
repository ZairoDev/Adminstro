import { description } from "@/components/charts/DonutChart";
import { quicklisting } from "@/models/quicklisting";
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
  try {
    const {
      roomId,
      ownerName,
      ownerMobile,
      propertyName,
      propertyImages,
      propertyDescription,
      propertyPrice,
      propertyAddress,
    } = await req.json();

    if (
      !roomId ||
      !ownerName ||
      !ownerMobile ||
      !propertyName ||
      !propertyImages.length ||
      !propertyDescription ||
      !propertyPrice ||
      !propertyAddress
    ) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    const newQuickListing = await quicklisting.create({
      ownerName,
      ownerMobile,
      propertyName,
      propertyImages,
      description: propertyDescription,
      basePrice: propertyPrice,
      address: propertyAddress,
    });

    if (!newQuickListing) {
      return NextResponse.json(
        { error: "Quick Listing not created" },
        { status: 400 }
      );
    }

    const propertyObject = {
      _id: newQuickListing._id,
      propertyImages: newQuickListing.propertyImages,
      VSID: "xxxx",
      price: newQuickListing.basePrice,
      postalCode: "000000",
      city: "xxxxx",
      state: "xxxxx",
      country: "xxxxx",
      isFavourite: newQuickListing.isFavourite,
      isVisit: false,
      isViewed: false,
      visitSchedule: "",
    };

    const room = await Rooms.findByIdAndUpdate(
      { _id: roomId },
      { $push: { showcaseProperties: propertyObject } }
    );

    if (!room) {
      return NextResponse.json(
        { error: "Property can not be added in room" },
        { status: 400 }
      );
    }

    await pusher.trigger(`room-${roomId}`, "showcasePropertyAdded", {
      data: propertyObject,
    });

    return NextResponse.json(newQuickListing, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof Error) {
      return NextResponse.json(
        { error: "Error in creating quick listing" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 400 }
    );
  }
}
