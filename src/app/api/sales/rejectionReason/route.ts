import { NextResponse } from "next/server";
import Query from "@/models/query";
import { connectDb } from "@/util/db";

connectDb();

export async function POST(req: Request) {
  try {
    const { id, rejectionReason } = await req.json();

    console.log("id: ", id);

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
    const updatedQuery = await Query.findByIdAndUpdate(
      id,
      { $set: { leadStatus: "rejected", reason: rejectionReason } },
      { new: true }
    );
    console.log("updated: ", updatedQuery);
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
