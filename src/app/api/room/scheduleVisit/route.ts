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
    const { roomId, propertyId, client } = await req.json();

    if (!roomId || !propertyId) {
      return NextResponse.json(
        { error: "Fill the credentials" },
        { status: 400 }
      );
    }

    const room = await Rooms.findById(roomId);

    if (!room) {
      return NextResponse.json({ error: "Invalid Room Id" }, { status: 400 });
    }

    room.showcaseProperties = room.showcaseProperties.map((property: any) => {
      if (property._id.toString() === propertyId) {
        return {
          ...property,
          isVisit: true,
        };
      } else {
        return property;
      }
    });

    room.save();

    await pusher.trigger(`room-${roomId}`, "visitApplied", {
      propertyId,
      client,
    });

    return NextResponse.json({ message: "Visit Scheduled" }, { status: 200 });
  } catch (err: unknown) {
    console.log("error in scheduling visit: ", err);
    return NextResponse.json(
      { error: "Error in scheduling visit" },
      { status: 400 }
    );
  }
}
