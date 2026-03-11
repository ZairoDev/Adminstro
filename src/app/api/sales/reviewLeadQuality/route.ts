import { NextRequest, NextResponse } from "next/server";
import Query from "@/models/query";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";

connectDb();

export async function POST(req: NextRequest) {
  try {
    await getDataFromToken(req);
    const { id, leadQualityByReviewer } = await req.json();
    if (!id || !leadQualityByReviewer) {
      return NextResponse.json(
        { success: false, message: "ID and leadQuality are required" },
        { status: 400 }
      );
    }
    const validLeadQualities = ["Good", "Very Good", "Average", "Below Average"];
    if (!validLeadQualities.includes(leadQualityByReviewer)) {
      return NextResponse.json(
        { success: false, message: "Invalid leadQuality value" },
        { status: 400 }
      );
    }
    const updatedQuery = await Query.findByIdAndUpdate(
      id,
      { leadQualityByReviewer },
      { timestamps: false }
      // { new: true },
    );
    if (!updatedQuery) {
      return NextResponse.json(
        { success: false, message: "Query not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: updatedQuery }, { status: 200 });
  } catch (err: unknown) {
    const error = err as { status?: number; code?: string };
    if (error?.status) {
      return NextResponse.json(
        { code: error.code || "AUTH_FAILED" },
        { status: error.status },
      );
    }
    console.error(err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
