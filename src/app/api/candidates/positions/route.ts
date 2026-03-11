export const dynamic = "force-dynamic";
import Candidate from "@/models/candidate";
import { connectDb } from "@/util/db";
import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";

export async function GET(request: NextRequest) {
  await connectDb();

  try {
    await getDataFromToken(request);
    // Get all unique positions from candidates
    const positions = await Candidate.distinct("position");

    return NextResponse.json({
      success: true,
      data: positions.filter((pos) => pos && pos.trim() !== "").sort(),
    });
  } catch (err: unknown) {
    const error = err as { status?: number; code?: string };
    if (error?.status) {
      return NextResponse.json(
        { code: error.code || "AUTH_FAILED" },
        { status: error.status },
      );
    }
    console.error("Error fetching positions:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch positions" },
      { status: 500 }
    );
  }
}





