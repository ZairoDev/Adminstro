import Rooms from "@/models/room";
import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";

export async function POST(req: NextRequest) {
  try {
    await getDataFromToken(req);
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
  } catch (err: unknown) {
    const error = err as { status?: number; code?: string; message?: string };
    if (error?.status) {
      return NextResponse.json(
        { code: error.code || "AUTH_FAILED" },
        { status: error.status },
      );
    }
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
