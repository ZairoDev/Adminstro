import Candidate from "@/models/candidate";
import Employee from "@/models/employee";
import OfficeAddress from "@/models/officeAddress";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { sendEmail } from "@/components/candidateEmail";
import { type NextRequest, NextResponse } from "next/server";
import {
  parseLocalDateString,
  normalizeToLocalMidnight,
  getTodayLocalMidnight,
} from "@/lib/utils";
import crypto from "crypto";
import { resolveOfficeAddressForEmail } from "@/lib/officeAddress/resolveOfficeAddressForEmail";
import mongoose from "mongoose";

function mapsSearchLink(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

// Schedule an interview for a candidate
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
    const body = await request.json();
    const { scheduledDate, scheduledTime, notes, interviewMode, officeAddressId } =
      body;

    if (!scheduledDate || !scheduledTime) {
      return NextResponse.json(
        { success: false, error: "Scheduled date and time are required" },
        { status: 400 }
      );
    }

    if (interviewMode !== "physical" && interviewMode !== "virtual") {
      return NextResponse.json(
        {
          success: false,
          error: "Interview mode is required (physical or virtual)",
        },
        { status: 400 }
      );
    }

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

    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(scheduledTime)) {
      return NextResponse.json(
        { success: false, error: "Invalid time format. Use HH:MM format" },
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
      "interviewDetails.scheduledDate": interviewDate,
      "interviewDetails.scheduledTime": scheduledTime,
      "interviewDetails.interviewMode": interviewMode,
      "interviewDetails.scheduledBy": userName || "Admin",
      "interviewDetails.scheduledAt": new Date(),
      "interviewDetails.officeAddressId":
        interviewMode === "physical" && resolvedOffice
          ? resolvedOffice.id
          : null,
      "interviewDetails.officeName":
        interviewMode === "physical" && resolvedOffice
          ? resolvedOffice.name
          : null,
    };

    // Keep candidate office assignment in sync when scheduling physical interview
    if (interviewMode === "physical" && resolvedOffice) {
      updateData.officeAddressId = resolvedOffice.id;
    }

    if (notes !== undefined) {
      updateData["interviewDetails.notes"] = notes || null;
    }

    const updatedCandidate = await Candidate.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    if (!updatedCandidate) {
      return NextResponse.json(
        { success: false, error: "Failed to schedule interview" },
        { status: 500 }
      );
    }

    const rescheduleToken = crypto.randomBytes(32).toString("hex");
    const baseUrl =
      process.env.APP_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      "http://localhost:3000";
    const rescheduleLink = `${baseUrl}/interview-reschedule?token=${rescheduleToken}&candidateId=${id}&type=first`;

    await Candidate.findByIdAndUpdate(id, {
      $set: {
        "interviewDetails.rescheduleRequest.token": rescheduleToken,
      },
    });

    try {
      const officeResolution =
        interviewMode === "physical" && resolvedOffice
          ? {
              address: resolvedOffice.address,
              officeName: resolvedOffice.name,
            }
          : await resolveOfficeAddressForEmail(id);

      await sendEmail({
        to: updatedCandidate.email,
        candidateName: updatedCandidate.name,
        status: "interview",
        position: updatedCandidate.position,
        companyName: process.env.COMPANY_NAME || "Zairo International",
        interviewDetails: {
          scheduledDate,
          scheduledTime,
          interviewMode,
          officeName: officeResolution.officeName || undefined,
          officeAddress: officeResolution.address,
          googleMapsLink:
            interviewMode === "physical"
              ? mapsSearchLink(officeResolution.address)
              : undefined,
          candidateId: id,
          interviewType: "first",
          rescheduleLink,
        },
      });
    } catch (emailError: unknown) {
      console.error(
        `❌ Failed to send interview scheduled email to ${updatedCandidate.email}:`,
        emailError
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedCandidate,
      message: "Interview scheduled successfully",
    });
  } catch (error: unknown) {
    console.error("Schedule interview error:", error);
    const message = error instanceof Error ? error.message : "";
    if (message === "Token Expired") {
      return NextResponse.json(
        { success: false, error: "Authentication expired" },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to schedule interview" },
      { status: 500 }
    );
  }
}
