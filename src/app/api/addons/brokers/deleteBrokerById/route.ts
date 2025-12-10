import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import Users from "@/models/user";

export async function DELETE(req: NextRequest) {
  try {
    await connectDb();
    const { brokerId } = await req.json();

    if (!brokerId)
      return NextResponse.json(
        { error: "Broker ID is required" },
        { status: 400 }
      );

    const broker = await Users.findOneAndDelete({
      _id: brokerId,
      role: "Broker",
    });

    if (!broker) {
      return NextResponse.json(
        { error: "Broker not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Broker deleted successfully" },
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: "Unable to delete broker" },
      { status: 401 }
    );
  }
}


