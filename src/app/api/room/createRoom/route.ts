import Rooms from "@/models/room";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { NextRequest, NextResponse } from "next/server";

connectDb();

function generateStrongPassword(length = 8) {
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

export async function POST(req: NextRequest) {
  try {
    const { lead } = await req.json();
    console.log("lead--: ", lead);

    if (!lead) {
      return NextResponse.json({ error: "Invalid lead" }, { status: 400 });
    }

    const employee = await getDataFromToken(req);
    console.log("employee: ", employee);

    const room = await Rooms.create({
      name: lead.name,
      lead: lead._id,
      participants: [employee.email, lead.email],
      password: generateStrongPassword(8),
    });
    console.log('created room": ', room);

    return NextResponse.json({ room }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: "Room not created" }, { status: 400 });
  }
}
