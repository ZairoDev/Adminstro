import { NextRequest, NextResponse } from "next/server";
import Query from "@/models/query";
import { connectDb } from "@/util/db";

connectDb();

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Please provide an ID.",
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

    return NextResponse.json({
      success: true,
      message: "Note fetched successfully.",
      note: query.note,
    });
  } catch (error) {
    console.error("Error fetching note:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
