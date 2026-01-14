import Candidate from "@/models/candidate";
import { connectDb } from "@/util/db";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  await connectDb();

  try {
    // Query for candidates with pending reschedule requests
    // Using MongoDB $or to find candidates with pending requests in either first or second round
    // Don't filter by status - candidates can have reschedule requests regardless of their current status
    const candidates = await Candidate.find({
      $or: [
        { "interviewDetails.rescheduleRequest.status": "pending" },
        { "secondRoundInterviewDetails.rescheduleRequest.status": "pending" },
      ],
    })
      .select("_id name email phone position interviewDetails secondRoundInterviewDetails status")
      .lean();

    const pendingRequests: Array<{
      candidateId: string;
      candidateName: string;
      interviewType: "first" | "second";
      requestedDate: string;
      requestedTime: string;
      reason?: string;
      currentDate?: string;
      currentTime?: string;
    }> = [];

    candidates.forEach((candidate: any) => {
      // Check first round interview reschedule request
      const firstRoundRequest = candidate.interviewDetails?.rescheduleRequest;
      if (firstRoundRequest && firstRoundRequest.status === "pending") {
        pendingRequests.push({
          candidateId: candidate._id.toString(),
          candidateName: candidate.name,
          interviewType: "first",
          requestedDate: firstRoundRequest.requestedDate || "",
          requestedTime: firstRoundRequest.requestedTime || "",
          reason: firstRoundRequest.reason,
          currentDate: candidate.interviewDetails?.scheduledDate,
          currentTime: candidate.interviewDetails?.scheduledTime,
        });
      }

      // Check second round interview reschedule request
      const secondRoundRequest = candidate.secondRoundInterviewDetails?.rescheduleRequest;
      if (secondRoundRequest && secondRoundRequest.status === "pending") {
        pendingRequests.push({
          candidateId: candidate._id.toString(),
          candidateName: candidate.name,
          interviewType: "second",
          requestedDate: secondRoundRequest.requestedDate || "",
          requestedTime: secondRoundRequest.requestedTime || "",
          reason: secondRoundRequest.reason,
          currentDate: candidate.secondRoundInterviewDetails?.scheduledDate,
          currentTime: candidate.secondRoundInterviewDetails?.scheduledTime,
        });
      }
    });

    return NextResponse.json({
      success: true,
      data: pendingRequests,
      count: pendingRequests.length,
    });
  } catch (error) {
    console.error("Error fetching pending reschedule requests:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch pending reschedule requests" },
      { status: 500 }
    );
  }
}

