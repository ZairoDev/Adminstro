import { NextResponse } from "next/server";

import Query from "@/models/query";
import { connectDb } from "@/util/db";

// Connect to the database
connectDb();

export async function POST(req: Request) {
  try {
    const { name } = await req.json();
    if (!name) {
      return NextResponse.json(
        { success: false, error: "Name is required" },
        { status: 400 }
      );
    }

    const regex = new RegExp(name, "i");

    const existingQuery = await Query.find({ name: regex });

    if (existingQuery.length > 0) {
      return NextResponse.json(
        {
          success: true,
          exists: true,
          message: "Name already exists",
          data: existingQuery,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        exists: false,
        message: "Name is available",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error checking phone number:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
