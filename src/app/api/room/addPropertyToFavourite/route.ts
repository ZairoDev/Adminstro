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
    const { roomId, favouriteProperties } = await req.json();
    console.log("roomId: ", roomId, favouriteProperties);

    if (!roomId) {
      return NextResponse.json(
        { error: "Room ID is required" },
        { status: 400 }
      );
    }

    if (!favouriteProperties || !Array.isArray(favouriteProperties)) {
      return NextResponse.json(
        { error: "Array of property IDs is required" },
        { status: 400 }
      );
    }

    const updateResult = await Rooms.updateOne(
      { _id: roomId },
      {
        $set: {
          "showcaseProperties.$[property].isFavourite": {
            $cond: {
              if: {
                $eq: ["$showcaseProperties.$[property].isFavourite", true],
              },
              then: false,
              else: true,
            },
          },
        },
      },
      {
        arrayFilters: [
          {
            "property._id": {
              $in: favouriteProperties.map(
                (id: string) => new mongoose.Types.ObjectId(id)
              ),
            },
          },
        ],
      }
    );

    await pusher.trigger(`room-${roomId}`, "updateFavourites", {
      favouriteProperties,
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
