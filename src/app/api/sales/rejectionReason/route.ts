import { NextRequest, NextResponse } from "next/server";
import Query from "@/models/query";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";

connectDb();

export async function POST(req: NextRequest) {
  try {
    await getDataFromToken(req);
    const { id, rejectionReason } = await req.json();

    if (!id || !rejectionReason) {
      return NextResponse.json(
        { success: false, message: "ID and leadQuality are required" },
        { status: 400 }
      );
    }
    
    const validLeadQualities = [
      "Not on whatsapp",
      "Not Replying",
      "Low Budget",
      "Blocked on whatsapp",
      "Late Response",
      "Delayed the Traveling",
      "Off Location",
      "Number of people exceeded",
      "Already got it",
      "Different Area",
      "Agency Fees",
      "Didn't like the option",
      "Low Duration",
    ];
    
    if (!validLeadQualities.includes(rejectionReason)) {
      return NextResponse.json(
        { success: false, message: "Invalid leadQuality value" },
        { status: 400 }
      );
    }

    // First get the lead to know the OLD disposition
    const existingQuery = await Query.findById(id);
    if (!existingQuery) {
      return NextResponse.json(
        { success: false, message: "Query not found" },
        { status: 404 }
      );
    }

    // Update the lead
    const updatedQuery = await Query.findByIdAndUpdate(
      id,
      { $set: { leadStatus: "rejected", reason: rejectionReason } },
      { new: true }
    );

    // Socket emit is now handled client-side via "lead-disposition-changed" event

    return NextResponse.json(
      { success: true, data: updatedQuery },
      { status: 200 }
    );
  } catch (err: unknown) {
    const error = err as { status?: number; code?: string };
    if (error?.status) {
      return NextResponse.json(
        { code: error.code || "AUTH_FAILED" },
        { status: error.status },
      );
    }
    console.error("❌ Error updating rejection reason:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
