import { sendEmail } from "@/components/candidateEmail";
import {
  canViewAssignedInterviews,
  isAssignedInterviewer,
} from "@/lib/interviews/assignedInterviews";
import { cancelCandidateInterviews } from "@/lib/interviews/publishInterview";
import Candidate from "@/models/candidate";
import Employee from "@/models/employee";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import mongoose from "mongoose";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("attendance"),
    interviewAttendance: z.enum(["appeared", "not_appeared"]).nullable(),
  }),
  z.object({
    action: z.literal("reject"),
    reason: z.string().trim().min(1).max(500),
  }),
]);

function jsonError(error: unknown, fallback: string) {
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
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status });
  }
  console.error(fallback, error);
  return NextResponse.json({ success: false, error: fallback }, { status: 500 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  try {
    const token = await getDataFromToken(request);
    const role = String(token.role ?? "");
    const employeeId = String(token.id ?? "");
    if (!canViewAssignedInterviews(role)) {
      return NextResponse.json(
        { success: false, error: "You do not have access to assigned interviews" },
        { status: 403 }
      );
    }

    const { candidateId } = await params;
    if (!mongoose.Types.ObjectId.isValid(candidateId) || !mongoose.Types.ObjectId.isValid(employeeId)) {
      return NextResponse.json(
        { success: false, error: "Interview not found" },
        { status: 404 }
      );
    }

    const parsedBody = bodySchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json(
        { success: false, error: parsedBody.error.issues[0]?.message || "Invalid request" },
        { status: 400 }
      );
    }

    await connectDb();
    const candidate = await Candidate.findById(candidateId);
    if (!candidate || !isAssignedInterviewer(candidate, employeeId)) {
      return NextResponse.json(
        { success: false, error: "Interview not found" },
        { status: 404 }
      );
    }

    if (parsedBody.data.action === "attendance") {
      candidate.interviewAttendance = parsedBody.data.interviewAttendance;
      await candidate.save();
      return NextResponse.json({
        success: true,
        interviewAttendance: candidate.interviewAttendance ?? null,
      });
    }

    if (candidate.status !== "interview") {
      return NextResponse.json(
        { success: false, error: "Only a candidate in interview can be rejected here" },
        { status: 400 }
      );
    }
    if (candidate.employeeId) {
      return NextResponse.json(
        { success: false, error: "Employed people cannot be rejected" },
        { status: 400 }
      );
    }
    if (!candidate.interviewDetails?.remarks?.evaluatedBy) {
      return NextResponse.json(
        { success: false, error: "Interview remarks must be completed before rejecting" },
        { status: 400 }
      );
    }

    candidate.status = "rejected";
    candidate.rejectionDetails = {
      reason: parsedBody.data.reason,
      category: "pipeline",
    };
    await candidate.save();

    try {
      await sendEmail({
        to: candidate.email,
        candidateName: candidate.name,
        status: "rejected",
        position: candidate.position,
        companyName: process.env.COMPANY_NAME || "Zairo International",
        rejectionReason: parsedBody.data.reason,
      });
    } catch (emailError: unknown) {
      console.error("Failed to send interview rejection email:", emailError);
    }

    try {
      await cancelCandidateInterviews(candidate);
    } catch (calendarError: unknown) {
      console.error("Failed to cancel interview calendar events:", calendarError);
    }

    const actorName =
      (typeof token.name === "string" && token.name.trim()) ||
      (await Employee.findById(employeeId).select("name"))?.name ||
      role;

    return NextResponse.json({
      success: true,
      status: "rejected",
      rejectedBy: actorName,
    });
  } catch (error: unknown) {
    return jsonError(error, "Failed to update this interview");
  }
}
