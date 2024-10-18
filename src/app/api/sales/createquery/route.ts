import { NextResponse } from "next/server";
import Pusher from "pusher";
import Query from "@/models/query"; 
import { connectDb } from "@/util/db";

connectDb();

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

export async function POST(req: Request) {
  try {
    const { name, email, price, intrest, about } = await req.json(); 
    const newQuery = await Query.create({
      name,
      email,
      price,
      intrest,
      about,
    });

    // Trigger the Pusher event
    await pusher.trigger("queries", "new-query", {
      name: newQuery.name,
      email: newQuery.email,
      price: newQuery.price,
      intrest: newQuery.intrest,
      about: newQuery.about,
      createdAt: newQuery.createdAt,
    });

    return NextResponse.json(
      { success: true, data: newQuery },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
