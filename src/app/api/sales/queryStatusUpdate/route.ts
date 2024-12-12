import { NextRequest, NextResponse } from "next/server";
import Query from "@/models/query";
import { connectDb } from "@/util/db";
import { Types } from "mongoose";

connectDb();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { message: "Query ID is required" },
        { status: 400 }
      );
    }

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Invalid query ID format" },
        { status: 400 }
      );
    }

    const updatedQuery = await Query.findByIdAndUpdate(
      id,
      { isViewed: true },
      { new: true }
    );

    if (!updatedQuery) {
      return NextResponse.json({ message: "Query not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Query marked as viewed",
      data: updatedQuery,
    });
  } catch (error: any) {
    console.error("Error marking query as viewed:", error);
    return NextResponse.json(
      {
        message: "Failed to mark query as viewed",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
