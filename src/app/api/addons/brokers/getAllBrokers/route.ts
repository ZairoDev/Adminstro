import { NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import Users from "@/models/user";

export async function GET() {
  try {
    await connectDb();
    const brokers = await Users.find({ role: "Broker" }).select(
      "name email phone _id"
    );
    const response = NextResponse.json({ data: brokers }, { status: 200 });

    // Tell browser/CDN to never cache this response
    response.headers.set(
      "Cache-Control",
      "no-cache, no-store, must-revalidate"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");

    return response;
  } catch (err) {
    return NextResponse.json(
      { error: "Unable to fetch brokers" },
      { status: 401 }
    );
  }
}


