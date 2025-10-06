import { connectDb } from "@/util/db";
import Rooms from "@/models/room";
import { NextRequest, NextResponse } from "next/server";
import Pusher from "pusher";
import mongoose from "mongoose";

connectDb();

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

export async function PATCH(req: NextRequest) {
  try {
    const { roomId, propertyIds, client } = await req.json();


    if (!roomId) {
      return NextResponse.json(
        { error: "Room ID is required" },
        { status: 400 }
      );
    }

    if (!propertyIds || !Array.isArray(propertyIds)) {
      return NextResponse.json(
        { error: "Array of property IDs is required" },
        { status: 400 }
      );
    }

    const objectIds = propertyIds.map((id) => new mongoose.Types.ObjectId(id));
    const room = await Rooms.findById(roomId);

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    room.showcaseProperties = room.showcaseProperties.map((property: any) => {
      if (objectIds.some((id) => id.equals(property._id))) {
        return {
          ...property,
          isFavourite: !property.isFavourite,
        };
      }
      return property;
    });

    // Save the updated document
    await room.save();

    await pusher.trigger(`room-${roomId}`, "updateFavourites", {
      propertyIds,
      client,
    });

    return NextResponse.json(
      { message: "Favourite properties updated successfully" },
      { status: 200 }
    );
  } catch (err: unknown) {
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }
}
