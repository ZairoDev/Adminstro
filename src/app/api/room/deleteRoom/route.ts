import { NextRequest, NextResponse } from "next/server";
import Rooms from "@/models/room";
import { getDataFromToken } from "@/util/getDataFromToken";

export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest) {
  try {
    await getDataFromToken(req);
    const roomId = req.nextUrl.searchParams.get("roomId");

    await Rooms.findByIdAndDelete(roomId);

    return NextResponse.json({ message: "Room Deleted" }, { status: 200 });
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
