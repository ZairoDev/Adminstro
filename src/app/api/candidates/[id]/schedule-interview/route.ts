import Candidate from "@/models/candidate";
import Employee from "@/models/employee";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { sendEmail } from "@/components/candidateEmail";
import { type NextRequest, NextResponse } from "next/server";
import { parseLocalDateString, normalizeToLocalMidnight, getTodayLocalMidnight } from "@/lib/utils";
import crypto from "crypto";

// Schedule an interview for a candidate
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDb();

  try {
    // Check authentication
    const token = await getDataFromToken(request);
    const userId = token.id as string;
    let userName = token.name as string;

    // Fetch employee name from database if not in token
    if (!userName && userId) {
      const employee = await Employee.findById(userId).select("name");
      userName = employee?.name || "Admin";
    }

    const { id } = await params;
    const body = await request.json();
    const { scheduledDate, scheduledTime, notes } = body;

    // Validate required fields
    if (!scheduledDate || !scheduledTime) {
      return NextResponse.json(
        { success: false, error: "Scheduled date and time are required" },
        { status: 400 }
      );
    }

    // Validate date is not in the past
    // CRITICAL: Parse date as local calendar date to prevent timezone shifts
    // The scheduledDate string (YYYY-MM-DD) represents a calendar date, not a UTC timestamp
    const interviewDate = parseLocalDateString(scheduledDate);
    const today = getTodayLocalMidnight();
    
    // Compare normalized local dates to ensure accurate validation
    const normalizedInterviewDate = normalizeToLocalMidnight(interviewDate);
    if (normalizedInterviewDate < today) {
      return NextResponse.json(
        { success: false, error: "Interview date cannot be in the past" },
        { status: 400 }
      );
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(scheduledTime)) {
      return NextResponse.json(
        { success: false, error: "Invalid time format. Use HH:MM format" },
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

    // Check if candidate is in pending status
    if (candidate.status !== "pending") {
      return NextResponse.json(
        { success: false, error: "Only pending candidates can be scheduled for interview" },
        { status: 400 }
      );
    }

    // Update candidate with interview details and change status to interview
    // CRITICAL: Store the date as parsed from local date string to preserve the intended calendar date
    // MongoDB will store this as UTC, but we parse it back correctly on retrieval
    const updateData: Record<string, unknown> = {
      status: "interview",
      "interviewDetails.scheduledDate": interviewDate, // Already parsed as local date
      "interviewDetails.scheduledTime": scheduledTime,
      "interviewDetails.scheduledBy": userName || "Admin",
      "interviewDetails.scheduledAt": new Date(),
    };

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

    // Generate reschedule token and link
    const rescheduleToken = crypto.randomBytes(32).toString("hex");
    const baseUrl =  process.env.APP_URL ||process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const rescheduleLink = `${baseUrl}/interview-reschedule?token=${rescheduleToken}&candidateId=${id}&type=first`;

    // Store reschedule token in candidate record
    await Candidate.findByIdAndUpdate(id, {
      $set: {
        "interviewDetails.rescheduleRequest.token": rescheduleToken,
      },
    });

    // Send interview scheduled email
    try {
      // CRITICAL: Use the original scheduledDate string (YYYY-MM-DD) directly
      // This preserves the exact calendar date selected by the user without timezone conversion
      await sendEmail({
        to: updatedCandidate.email,
        candidateName: updatedCandidate.name,
        status: "interview",
        position: updatedCandidate.position,
        companyName: process.env.COMPANY_NAME || "Zairo International",
        interviewDetails: {
          scheduledDate: scheduledDate, // Use original string to preserve calendar date
          scheduledTime: scheduledTime,
          officeAddress: "117/N/70, Kakadeo Rd, Near Manas Park, Ambedkar Nagar, Navin Nagar, Kakadeo, Kanpur, Uttar Pradesh 208025",
          googleMapsLink: "https://www.google.com/maps/place/Zairo+International+Private+Limited/@26.4774594,80.294648,19.7z/data=!4m14!1m7!3m6!1s0x399c393b0d80423f:0x5a0054d06432272d!2sZairo+International+Private+Limited!8m2!3d26.477824!4d80.2947677!16s%2Fg%2F11w8pj2ggg!3m5!1s0x399c393b0d80423f:0x5a0054d06432272d!8m2!3d26.477824!4d80.2947677!16s%2Fg%2F11w8pj2ggg?entry=ttu&g_ep=EgoyMDI1MTIwOS4wIKXMDSoASAFQAw%3D%3D",
          candidateId: id,
          interviewType: "first",
          rescheduleLink: rescheduleLink,
        },
      });
      console.log(`✅ Interview scheduled email sent successfully to ${updatedCandidate.email}`);
    } catch (emailError: any) {
      // Log email error but don't fail the entire operation
      console.error(`❌ Failed to send interview scheduled email to ${updatedCandidate.email}:`, emailError);
      // Continue with the interview scheduling even if email fails
    }

    return NextResponse.json({
      success: true,
      data: updatedCandidate,
      message: "Interview scheduled successfully",
    });
  } catch (error: any) {
    console.error("Schedule interview error:", error);
    if (error.message === "Token Expired") {
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

