import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import Candidate from "@/models/candidate";

connectDb();

export async function PUT(req: NextRequest) {
  try {
    const { candidateId } = await req.json();
    const updatedCandidate = await Candidate.findByIdAndUpdate(
      candidateId,
      { status: "Called" },
      { new: true }
    );

    if (!updatedCandidate) {
      return NextResponse.json(
        { error: "Candidate not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(updatedCandidate);
  } catch (error: any) {
    console.error("Error updating candidate status:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
