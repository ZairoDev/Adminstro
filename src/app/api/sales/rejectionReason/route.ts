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
      "Late Response",
      "Delayed the Traveling",
      "Allready got it",
      "Didn't like the option",
      "Low Budget",
      "Number of people exceeded",
      "Off Location",
      "Blocked on whatsapp",
      "Not on whatsapp",
      "Not Replying",
    ];
    if (!validLeadQualities.includes(rejectionReason)) {
      return NextResponse.json(
        { success: false, message: "Invalid leadQuality value" },
        { status: 400 }
      );
    }
    const updatedQuery = await Query.findByIdAndUpdate(
      id,
      { rejectionReason },
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
