import Candidate from "@/models/candidate";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { getTodayLocalMidnight } from "@/lib/utils";
import {
  buildAssignedInterviewList,
  canViewAssignedInterviews,
  toCalendarDateKey,
  type CandidateInterviewRecord,
  type InterviewRange,
} from "@/lib/interviews/assignedInterviews";
import mongoose from "mongoose";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const rangeSchema = z.enum(["today", "all"]);

function emptyPayload(range: InterviewRange) {
  return {
    success: true as const,
    range,
    counts: { today: 0, all: 0 },
    data: [],
  };
}

export async function GET(request: NextRequest) {
  try {
    const token = await getDataFromToken(request);
    const role = String(token.role ?? "");
    if (!canViewAssignedInterviews(role)) {
      return NextResponse.json(
        { success: false, error: "You do not have access to assigned interviews" },
        { status: 403 }
      );
    }

    const parsedRange = rangeSchema.safeParse(
      request.nextUrl.searchParams.get("range") ?? "today"
    );
    if (!parsedRange.success) {
      return NextResponse.json(
        { success: false, error: "Filter must be today or all" },
        { status: 400 }
      );
    }
    const range = parsedRange.data;
    const employeeId = String(token.id ?? "");

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return NextResponse.json(emptyPayload(range));
    }

    await connectDb();
    const candidates = (await Candidate.find({
      $or: [
        { "interviewDetails.interviewerEmployeeId": employeeId },
        { "secondRoundInterviewDetails.interviewerEmployeeId": employeeId },
      ],
    })
      .select(
        "name email phone position department status resumeUrl interviewAttendance interviewDetails secondRoundInterviewDetails"
      )
      .lean()) as CandidateInterviewRecord[];

    const result = buildAssignedInterviewList(
      candidates,
      employeeId,
      toCalendarDateKey(getTodayLocalMidnight()),
      range
    );

    return NextResponse.json({
      success: true,
      range,
      counts: result.counts,
      data: result.data,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";
    if (message === "Token Expired") {
      return NextResponse.json(
        { success: false, error: "Authentication expired" },
        { status: 401 }
      );
    }
    const status =
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      typeof error.status === "number"
        ? error.status
        : 500;
    if (status === 401 || status === 403) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status }
      );
    }
    console.error("List assigned interviews error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load interviews" },
      { status: 500 }
    );
  }
}
