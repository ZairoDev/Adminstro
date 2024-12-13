import Rooms from "@/models/room";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { NextRequest, NextResponse } from "next/server";

connectDb();

export async function POST(req: NextRequest) {
	try {
		const { roomId, roomPassword } = await req.json();
		console.log("roomId: ", roomId);
		console.log("roomPassword: ", roomPassword);

		let roomToken = "Visitor";
		try {
			const token = await getDataFromToken(req);
			roomToken = token.role as string;
		} catch (err: any) {}

		if (!roomId || !roomPassword) {
			return NextResponse.json(
				{ error: "Fill the credentials" },
				{ status: 400 }
			);
		}
		const room = await Rooms.findById(roomId);

		if (!room) {
			return NextResponse.json(
				{ error: "Room Does Not Exist!" },
				{ status: 400 }
			);
		}

		if (room.password !== roomPassword) {
			return NextResponse.json(
				{ error: "Invalid Room Credentials" },
				{ status: 400 }
			);
		}

		if (!room.isActive) {
			return NextResponse.json(
				{ error: "This room had been closed" },
				{ status: 400 }
			);
		}
		console.log("room token: ", roomToken);
		return NextResponse.json(
			{
				message: "Joined Room",
				role: roomToken,
				customerName: room.name,
			},
			{ status: 200 }
		);
	} catch (err: any) {
		return NextResponse.json(
			{ error: "Room does not Exist" },
			{ status: 400 }
		);
	}
}
