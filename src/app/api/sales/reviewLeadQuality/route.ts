import { NextResponse } from "next/server";
import Query from "@/models/query";
import { connectDb } from "@/util/db";

connectDb();

export async function POST(req: Request) {
  try {
    const { id, leadQualityByReviwer } = await req.json();
    if (!id || !leadQualityByReviwer) {
      return NextResponse.json(
        { success: false, message: "ID and leadQuality are required" },
        { status: 400 }
      );
    }

    const validLeadQualities = [
      "Good",
      "Very Good",
      "Average",
      "Below Average",
    ];
    if (!validLeadQualities.includes(leadQualityByReviwer)) {
      return NextResponse.json(
        { success: false, message: "Invalid leadQuality value" },
        { status: 400 }
      );
    }
    const updatedQuery = await Query.findByIdAndUpdate(
        id,
      { leadQualityByReviwer },
      { new: true }
    );
    if (!updatedQuery) {
      return NextResponse.json(
        { success: false, message: "Query not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { success: true, data: updatedQuery },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
