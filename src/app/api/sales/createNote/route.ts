import { NextRequest, NextResponse } from "next/server";
import Query from "@/models/query";
import { connectDb } from "@/util/db";

connectDb();

export async function POST(req: NextRequest) {
  try {
    const { id, note } = await req.json();
    if (!id || !note) {
      return NextResponse.json(
        {
          success: false,
          error: "Please provide both id and note.",
        },
        { status: 400 }
      );
    }
    const query = await Query.findById(id);
    if (!query) {
      return NextResponse.json(
        {
          success: false,
          error: "Query not found.",
        },
        { status: 404 }
      );
    }

    query.note = note;
    await query.save();
    
    return NextResponse.json({
      success: true,
      message: "Note added successfully.",
      data: query,
    });
  } catch (error) {
    console.error("Error adding note:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
