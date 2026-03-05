import Query from "@/models/query";
import Rooms from "@/models/room";
import { connectDb } from "@/util/db";
import { generatePassword } from "@/util/generatePassword";
import { getDataFromToken } from "@/util/getDataFromToken";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

connectDb();


export async function POST(req: NextRequest) {
  try {
    const { lead } = await req.json();

    if (!lead) {
      return NextResponse.json({ error: "Invalid lead" }, { status: 400 });
    }

    const employee = await getDataFromToken(req);

    const room = await Rooms.create({
      name: lead.name,
      lead: lead._id,
      participants: [employee.email, lead.phoneNo.toString()],
      password: generatePassword(4),
    });

    await Query.findByIdAndUpdate(
      { _id: new mongoose.Types.ObjectId(lead._id) },
      { roomDetails: { roomId: room._id, roomPassword: room.password } }
    );

    return NextResponse.json({ room }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: "Room not created" }, { status: 400 });
  }
}
