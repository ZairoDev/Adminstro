import Candidate from "@/models/candidate";
import Employee from "@/models/employee";
import OfficeAddress from "@/models/officeAddress";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { type NextRequest, NextResponse } from "next/server";
import { scheduleInterviewBodySchema } from "@/lib/interviews/scheduleInterviewSchema";
import { loadActiveInterviewer } from "@/lib/interviews/loadInterviewer";
import { finalizeScheduledInterview } from "@/lib/interviews/publishInterview";
import {
  parseLocalDateString,
  normalizeToLocalMidnight,
  getTodayLocalMidnight,
} from "@/lib/utils";
import crypto from "crypto";
import mongoose from "mongoose";

function mapsSearchLink(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

// Schedule a second round interview for a candidate
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDb();

  try {
    const token = await getDataFromToken(request);
    const userId = token.id as string;
    let userName = token.name as string;

    if (!userName && userId) {
      const employee = await Employee.findById(userId).select("name");
      userName = employee?.name || "Admin";
    }

    const { id } = await params;
    const parsedBody = scheduleInterviewBodySchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsedBody.error.issues[0]?.message || "Invalid request",
        },
        { status: 400 }
      );
    }
    const { scheduledDate, scheduledTime, notes, interviewMode, officeAddressId } =
      parsedBody.data;

    const interviewerResult = await loadActiveInterviewer(
      parsedBody.data.interviewerEmployeeId
    );
    if (!interviewerResult.ok) {
      return NextResponse.json(
        { success: false, error: interviewerResult.error },
        { status: 400 }
      );
    }
    const interviewer = interviewerResult.interviewer;

    let resolvedOffice: {
      id: string;
      name: string;
      address: string;
    } | null = null;

    if (interviewMode === "physical") {
      if (
        !officeAddressId ||
        !mongoose.Types.ObjectId.isValid(String(officeAddressId))
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Office is required for a physical interview",
          },
          { status: 400 }
        );
      }
      const office = await OfficeAddress.findById(officeAddressId);
      if (!office || office.isActive === false) {
        return NextResponse.json(
          { success: false, error: "Selected office was not found or is inactive" },
          { status: 400 }
        );
      }
      resolvedOffice = {
        id: String(office._id),
        name: String(office.name || "").trim(),
        address:
          String(office.formattedAddress || "").trim() ||
          "Office address will be shared by HR before your visit.",
      };
    }

    const interviewDate = parseLocalDateString(scheduledDate);
    const today = getTodayLocalMidnight();
    const normalizedInterviewDate = normalizeToLocalMidnight(interviewDate);
    if (normalizedInterviewDate < today) {
      return NextResponse.json(
        { success: false, error: "Interview date cannot be in the past" },
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

    const updateData: Record<string, unknown> = {
      status: "interview",
      "secondRoundInterviewDetails.scheduledDate": interviewDate,
      "secondRoundInterviewDetails.scheduledTime": scheduledTime,
      "secondRoundInterviewDetails.interviewMode": interviewMode,
      "secondRoundInterviewDetails.scheduledBy": userName || "Admin",
      "secondRoundInterviewDetails.scheduledAt": new Date(),
      "secondRoundInterviewDetails.interviewerEmployeeId": interviewer.id,
      "secondRoundInterviewDetails.interviewerName": interviewer.name,
      "secondRoundInterviewDetails.interviewerEmail": interviewer.email,
      "secondRoundInterviewDetails.calendarSyncError": null,
      "secondRoundInterviewDetails.officeAddressId":
        interviewMode === "physical" && resolvedOffice
          ? resolvedOffice.id
          : null,
      "secondRoundInterviewDetails.officeName":
        interviewMode === "physical" && resolvedOffice
          ? resolvedOffice.name
          : null,
    };

    if (interviewMode === "physical" && resolvedOffice) {
      updateData.officeAddressId = resolvedOffice.id;
    }

    if (notes !== undefined) {
      updateData["secondRoundInterviewDetails.notes"] = notes || null;
    }

    const updatedCandidate = await Candidate.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    if (!updatedCandidate) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to schedule second round interview",
        },
        { status: 500 }
      );
    }

    const rescheduleToken = crypto.randomBytes(32).toString("hex");
    const baseUrl = process.env.APP_URL || "http://localhost:3000";
    const rescheduleLink = `${baseUrl}/interview-reschedule?token=${rescheduleToken}&candidateId=${id}&type=second`;

    await Candidate.findByIdAndUpdate(id, {
      $set: {
        "secondRoundInterviewDetails.rescheduleRequest.token": rescheduleToken,
      },
    });

    const existingEventId =
      typeof candidate.secondRoundInterviewDetails?.googleEventId === "string"
        ? candidate.secondRoundInterviewDetails.googleEventId
        : null;
    const existingMeetLink =
      typeof candidate.secondRoundInterviewDetails?.googleMeetLink === "string"
        ? candidate.secondRoundInterviewDetails.googleMeetLink
        : null;

    try {
      await finalizeScheduledInterview({
        candidateId: id,
        round: "second",
        candidateName: updatedCandidate.name,
        candidateEmail: updatedCandidate.email,
        position: updatedCandidate.position,
        interviewerName: interviewer.name,
        interviewerEmail: interviewer.email,
        scheduledDate,
        scheduledTime,
        interviewMode,
        officeName:
          interviewMode === "physical" && resolvedOffice ? resolvedOffice.name : null,
        officeAddress:
          interviewMode === "physical" && resolvedOffice ? resolvedOffice.address : null,
        googleMapsLink:
          interviewMode === "physical" && resolvedOffice
            ? mapsSearchLink(resolvedOffice.address)
            : null,
        notes: notes ?? null,
        rescheduleLink,
        existingEventId,
        existingMeetLink,
      });
    } catch (emailError: unknown) {
      console.error(
        `❌ Failed to send second round interview email to ${updatedCandidate.email}:`,
        emailError
      );
    }

    const latest = await Candidate.findById(id);

    return NextResponse.json({
      success: true,
      data: latest ?? updatedCandidate,
      message: "Second round interview scheduled successfully",
    });
  } catch (error: unknown) {
    console.error("Schedule second round interview error:", error);
    const message = error instanceof Error ? error.message : "";
    if (message === "Token Expired") {
      return NextResponse.json(
        { success: false, error: "Authentication expired" },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to schedule second round interview" },
      { status: 500 }
    );
  }
}
