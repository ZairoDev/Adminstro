import Rooms from "@/models/room";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { page, phone } = await req.json();

    let query: Record<string, any> = {};
    if (phone) query["participants"] = RegExp(phone, "i");

    const rooms = await Rooms.find(query)
      .skip((page - 1) * 10)
      .sort({ createdAt: -1 });

    const totalRooms = await Rooms.estimatedDocumentCount();

    if (!rooms) {
      return NextResponse.json({ message: "No rooms found" }, { status: 200 });
    }

    return NextResponse.json({ rooms, totalRooms }, { status: 200 });
  } catch (err: any) {
    const error = new Error(err);

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
