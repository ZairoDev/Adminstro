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
    const { roomId, propertyId, visitTime, visitDate, visitType, client } =
      await req.json();

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

    const date = new Date(visitDate).toLocaleDateString("en-GB");

    room.showcaseProperties = room.showcaseProperties.map((property: any) => {
      if (property._id.toString() === propertyId) {
        return {
          ...property,
          visitSchedule: `${date}-${visitTime}-${visitType}`,
        };
      } else {
        return property;
      }
    });

    room.save();

    await pusher.trigger(`room-${roomId}`, "visitUpdated", {
      propertyId,
      visitSchedule: `${date}-${visitTime}-${visitType}`,
      client,
    });

    return NextResponse.json({ message: "Visit Updated" }, { status: 200 });
  } catch (err: unknown) {
    console.log("error in updating visit: ", err);
    return NextResponse.json(
      { error: "Error in updating visit" },
      { status: 400 }
    );
  }
}
