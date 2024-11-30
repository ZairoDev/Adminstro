import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import Candidate from "@/models/candidate";

connectDb();

export async function POST(req: NextRequest) {
  try {
    const CandidateData = await req.json();
    const { name, email, phone, position } = CandidateData;
    const existingCandidate = await Candidate.findOne({
      $or: [{ email }, { phone }],
    });
    if (existingCandidate) {
      return NextResponse.json(
        {
          error:
            "You have already registered. Please contact HR for further assistance.",
        },
        { status: 400 }
      );
    }
    const waitingCount = await Candidate.countDocuments({ status: "waiting" });
    const newCandidate = await Candidate.create({
      name,
      email,
      phone,
      position,
      queueNumber: waitingCount + 1,
    });
    return NextResponse.json(newCandidate);
  } catch (error: any) {
    console.log(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
