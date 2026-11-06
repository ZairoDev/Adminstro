import Candidate from "@/models/candidate";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { cancelInterviewRound } from "@/lib/interviews/publishInterview";
import { type NextRequest, NextResponse } from "next/server";

type InterviewRound = "first" | "second";

function roundPrefix(round: InterviewRound): string {
  return round === "first" ? "interviewDetails" : "secondRoundInterviewDetails";
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDb();

  try {
    await getDataFromToken(request);
    const { id } = await params;
    const body = (await request.json()) as { round?: string };
    const round: InterviewRound = body.round === "second" ? "second" : "first";

    const candidate = await Candidate.findById(id);
    if (!candidate) {
      return NextResponse.json(
        { success: false, error: "Candidate not found" },
        { status: 404 }
      );
    }

    const details =
      round === "first"
        ? candidate.interviewDetails
        : candidate.secondRoundInterviewDetails;
    if (!details?.scheduledDate) {
      return NextResponse.json(
        { success: false, error: "No interview is scheduled for that round" },
        { status: 400 }
      );
    }

    try {
      await cancelInterviewRound(candidate, round);
    } catch (noticeError: unknown) {
      console.error("Interview cancellation notice failed:", noticeError);
    }

    const prefix = roundPrefix(round);
    const other =
      round === "first"
        ? candidate.secondRoundInterviewDetails
        : candidate.interviewDetails;
    const otherStillScheduled = Boolean(other?.scheduledDate);
    const nextStatus = otherStillScheduled
      ? candidate.status
      : candidate.status === "interview"
        ? "pending"
        : candidate.status;

    const updated = await Candidate.findByIdAndUpdate(
      id,
      {
        $set: { status: nextStatus },
        $unset: {
          [`${prefix}.scheduledDate`]: "",
          [`${prefix}.scheduledTime`]: "",
          [`${prefix}.interviewMode`]: "",
          [`${prefix}.scheduledBy`]: "",
          [`${prefix}.scheduledAt`]: "",
          [`${prefix}.interviewerEmployeeId`]: "",
          [`${prefix}.interviewerName`]: "",
          [`${prefix}.interviewerEmail`]: "",
          [`${prefix}.officeAddressId`]: "",
          [`${prefix}.officeName`]: "",
          [`${prefix}.googleEventId`]: "",
          [`${prefix}.googleMeetLink`]: "",
          [`${prefix}.calendarSyncError`]: "",
          [`${prefix}.notes`]: "",
          [`${prefix}.rescheduleRequest`]: "",
        },
      },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Interview cancelled",
    });
  } catch (error: unknown) {
    console.error("Cancel interview error:", error);
    const message = error instanceof Error ? error.message : "";
    if (message === "Token Expired") {
      return NextResponse.json(
        { success: false, error: "Authentication expired" },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to cancel interview" },
      { status: 500 }
    );
  }
}
