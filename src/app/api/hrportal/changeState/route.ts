import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import Candidate from "@/models/candidate";

connectDb();

export async function PATCH(req: NextRequest) {
  try {
    const { id, status } = await req.json();
    if (!["waiting", "called"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status value. Must be 'waiting' or 'called'" },
        { status: 400 }
      );
    }
    const candidate = await Candidate.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );
    if (!candidate) {
      return NextResponse.json(
        { error: "Candidate not found." },
        { status: 404 }
      );
    }
    return NextResponse.json({
      message: "Candidate status updated successfully.",
      candidate,
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: "An error occurred while updating the candidate status." },
      { status: 500 }
    );
  }
}
