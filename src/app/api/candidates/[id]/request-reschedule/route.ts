import Candidate from "@/models/candidate";
import { connectDb } from "@/util/db";
import { type NextRequest, NextResponse } from "next/server";
import { parseLocalDateString, normalizeToLocalMidnight, getTodayLocalMidnight } from "@/lib/utils";

// Candidate submits a reschedule request
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDb();

  try {
    const { id } = await params;
    const body = await request.json();
    const { requestedDate, requestedTime, reason, token, interviewType } = body;

    // Validate required fields
    if (!requestedDate || !requestedTime || !token || !interviewType) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate interview type
    if (interviewType !== "first" && interviewType !== "second") {
      return NextResponse.json(
        { success: false, error: "Invalid interview type" },
        { status: 400 }
      );
    }

    // Check if candidate exists
    const candidate = await Candidate.findById(id);
    if (!candidate) {
      return NextResponse.json(
        { success: false, error: "Candidate not found" },
        { status: 404 }
      );
    }

    // Validate token
    const interviewPath = interviewType === "first" ? "interviewDetails" : "secondRoundInterviewDetails";
    const storedToken = candidate[interviewPath]?.rescheduleRequest?.token;

    if (!storedToken || storedToken !== token) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired reschedule link" },
        { status: 401 }
      );
    }

    // Check if there's already a pending request
    const existingRequest = candidate[interviewPath]?.rescheduleRequest;
    if (existingRequest?.status === "pending") {
      return NextResponse.json(
        { success: false, error: "You already have a pending reschedule request" },
        { status: 400 }
      );
    }

    // Validate date is not in the past
    const requestedDateObj = parseLocalDateString(requestedDate);
    const today = getTodayLocalMidnight();
    const normalizedRequestedDate = normalizeToLocalMidnight(requestedDateObj);
    if (normalizedRequestedDate < today) {
      return NextResponse.json(
        { success: false, error: "Requested date cannot be in the past" },
        { status: 400 }
      );
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(requestedTime)) {
      return NextResponse.json(
        { success: false, error: "Invalid time format. Use HH:MM format" },
        { status: 400 }
      );
    }

    // Update candidate with reschedule request
    const updateData: Record<string, unknown> = {
      [`${interviewPath}.rescheduleRequest.requestedDate`]: requestedDate,
      [`${interviewPath}.rescheduleRequest.requestedTime`]: requestedTime,
      [`${interviewPath}.rescheduleRequest.reason`]: reason || null,
      [`${interviewPath}.rescheduleRequest.requestedAt`]: new Date(),
      [`${interviewPath}.rescheduleRequest.status`]: "pending",
    };

    const updatedCandidate = await Candidate.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    if (!updatedCandidate) {
      return NextResponse.json(
        { success: false, error: "Failed to submit reschedule request" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Reschedule request submitted successfully. HR will review your request shortly.",
    });
  } catch (error: any) {
    console.error("Request reschedule error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to submit reschedule request" },
      { status: 500 }
    );
  }
}

// Get reschedule request status (for validation)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDb();

  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");
    const interviewType = searchParams.get("type");

    if (!token || !interviewType) {
      return NextResponse.json(
        { success: false, error: "Token and interview type are required" },
        { status: 400 }
      );
    }

    const candidate = await Candidate.findById(id);
    if (!candidate) {
      return NextResponse.json(
        { success: false, error: "Candidate not found" },
        { status: 404 }
      );
    }

    const interviewPath = interviewType === "first" ? "interviewDetails" : "secondRoundInterviewDetails";
    const rescheduleRequest = candidate[interviewPath]?.rescheduleRequest;

    if (!rescheduleRequest || rescheduleRequest.token !== token) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired reschedule link" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        candidateName: candidate.name,
        candidateEmail: candidate.email,
        currentDate: candidate[interviewPath]?.scheduledDate,
        currentTime: candidate[interviewPath]?.scheduledTime,
        rescheduleRequest: {
          requestedDate: rescheduleRequest.requestedDate,
          requestedTime: rescheduleRequest.requestedTime,
          reason: rescheduleRequest.reason,
          status: rescheduleRequest.status,
          requestedAt: rescheduleRequest.requestedAt,
        },
      },
    });
  } catch (error: any) {
    console.error("Get reschedule request error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get reschedule request" },
      { status: 500 }
    );
  }
}

