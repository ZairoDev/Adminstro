import { NextRequest, NextResponse } from "next/server";
import Rooms from "@/models/room";

export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest) {
  const roomId = await req.nextUrl.searchParams.get("roomId");

  try {
    await Rooms.findByIdAndDelete(roomId);

    return NextResponse.json({ message: "Room Deleted" }, { status: 200 });
  } catch (err: any) {
    const error = new Error(err);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
