import { NextResponse } from "next/server";

import Query from "@/models/query";
import { connectDb } from "@/util/db";

connectDb();

export async function POST(req: Request) {
  try {
    const { phoneNo } = await req.json();
    if (!phoneNo) {
      return NextResponse.json(
        { success: false, message: "Phone number is required" },
        { status: 400 }
      );
    }
    const query = await Query.find({ phoneNo });
    return NextResponse.json({ success: true, data: query }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
