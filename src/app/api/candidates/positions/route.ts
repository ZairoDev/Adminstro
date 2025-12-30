import Candidate from "@/models/candidate";
import { connectDb } from "@/util/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  await connectDb();

  try {
    // Get all unique positions from candidates
    const positions = await Candidate.distinct("position");

    return NextResponse.json({
      success: true,
      data: positions.filter((pos) => pos && pos.trim() !== "").sort(),
    });
  } catch (error) {
    console.error("Error fetching positions:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch positions" },
      { status: 500 }
    );
  }
}

