import Rooms from "@/models/room";
import { connectDb } from "@/util/db";
import { NextRequest, NextResponse } from "next/server";

connectDb();

export async function POST(req: NextRequest) {
  const { roomId } = await req.json();
  if (!roomId) {
    return NextResponse.json({ error: "Provide Room Id" }, { status: 400 });
  }
  try {
    const room = await Rooms.findById(roomId);

    if (!room) {
      return NextResponse.json({ error: "Invalid Room Id" }, { status: 400 });
    }

    const roomProperties = room.showcaseProperties;

    return NextResponse.json({ data: roomProperties }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Error in fetching properties from room" },
      { status: 400 }
    );
  }
}
