import Candidate from "@/models/candidate";
import Employee from "@/models/employee";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { sendEmail } from "@/components/candidateEmail";
import { type NextRequest, NextResponse } from "next/server";
import { parseLocalDateString, normalizeToLocalMidnight, getTodayLocalMidnight } from "@/lib/utils";

// HR approves or rejects a reschedule request
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
    const userRole = token.role as string;

    // Only HR and SUPERADMIN can approve reschedule requests
    if (userRole !== "HR" && userRole !== "SuperAdmin") {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Only HR and SUPERADMIN can approve reschedule requests." },
        { status: 403 }
      );
    }

    // Fetch employee name from database if not in token
    if (!userName && userId) {
      const employee = await Employee.findById(userId).select("name");
      userName = employee?.name || "Admin";
    }

    const { id } = await params;
    const body = await request.json();
    const { action, interviewType } = body; // action: "approve" or "reject"

    if (!action || (action !== "approve" && action !== "reject")) {
      return NextResponse.json(
        { success: false, error: "Invalid action. Must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    if (!interviewType || (interviewType !== "first" && interviewType !== "second")) {
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

    const interviewPath = interviewType === "first" ? "interviewDetails" : "secondRoundInterviewDetails";
    const rescheduleRequest = candidate[interviewPath]?.rescheduleRequest;

    if (!rescheduleRequest || rescheduleRequest.status !== "pending") {
      return NextResponse.json(
        { success: false, error: "No pending reschedule request found" },
        { status: 400 }
      );
    }

    if (action === "approve") {
      // Update interview date and time
      const requestedDate = parseLocalDateString(rescheduleRequest.requestedDate);
      const requestedTime = rescheduleRequest.requestedTime;

      // Validate date is not in the past
      const today = getTodayLocalMidnight();
      const normalizedRequestedDate = normalizeToLocalMidnight(requestedDate);
      if (normalizedRequestedDate < today) {
        return NextResponse.json(
          { success: false, error: "Requested date is in the past. Cannot approve." },
          { status: 400 }
        );
      }

      const updateData: Record<string, unknown> = {
        [`${interviewPath}.scheduledDate`]: requestedDate,
        [`${interviewPath}.scheduledTime`]: requestedTime,
        [`${interviewPath}.rescheduleRequest.status`]: "approved",
        [`${interviewPath}.rescheduleRequest.reviewedBy`]: `${userName} (${userRole})`,
        [`${interviewPath}.rescheduleRequest.reviewedAt`]: new Date(),
      };

      const updatedCandidate = await Candidate.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true }
      );

      if (!updatedCandidate) {
        return NextResponse.json(
          { success: false, error: "Failed to approve reschedule request" },
          { status: 500 }
        );
      }

      // Send reschedule confirmation email
      try {
        await sendEmail({
          to: updatedCandidate.email,
          candidateName: updatedCandidate.name,
          status: interviewType === "first" ? "interviewRescheduled" : "secondRoundInterviewRescheduled",
          position: updatedCandidate.position,
          companyName: process.env.COMPANY_NAME || "Zairo International",
          interviewDetails: {
            scheduledDate: rescheduleRequest.requestedDate,
            scheduledTime: requestedTime,
            officeAddress: "117/N/70, Kakadeo Rd, Near Manas Park, Ambedkar Nagar, Navin Nagar, Kakadeo, Kanpur, Uttar Pradesh 208025",
            googleMapsLink: "https://www.google.com/maps/place/Zairo+International+Private+Limited/@26.4774594,80.294648,19.7z/data=!4m14!1m7!3m6!1s0x399c393b0d80423f:0x5a0054d06432272d!2sZairo+International+Private+Limited!8m2!3d26.477824!4d80.2947677!16s%2Fg%2F11w8pj2ggg!3m5!1s0x399c393b0d80423f:0x5a0054d06432272d!8m2!3d26.477824!4d80.2947677!16s%2Fg%2F11w8pj2ggg?entry=ttu&g_ep=EgoyMDI1MTIwOS4wIKXMDSoASAFQAw%3D%3D",
          },
        });
        console.log(`✅ Reschedule confirmation email sent successfully to ${updatedCandidate.email}`);
      } catch (emailError: any) {
        console.error(`❌ Failed to send reschedule confirmation email to ${updatedCandidate.email}:`, emailError);
        // Continue even if email fails
      }

      return NextResponse.json({
        success: true,
        message: "Reschedule request approved successfully",
        data: updatedCandidate,
      });
    } else {
      // Reject reschedule request
      const updateData: Record<string, unknown> = {
        [`${interviewPath}.rescheduleRequest.status`]: "rejected",
        [`${interviewPath}.rescheduleRequest.reviewedBy`]: `${userName} (${userRole})`,
        [`${interviewPath}.rescheduleRequest.reviewedAt`]: new Date(),
      };

      const updatedCandidate = await Candidate.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true }
      );

      if (!updatedCandidate) {
        return NextResponse.json(
          { success: false, error: "Failed to reject reschedule request" },
          { status: 500 }
        );
      }

      // Send reschedule rejection email
      try {
        // Get current scheduled date and time from the interview details
        const interviewDetails = interviewType === "first" 
          ? updatedCandidate.interviewDetails 
          : updatedCandidate.secondRoundInterviewDetails;
        
        const currentScheduledDate = interviewDetails?.scheduledDate;
        const currentScheduledTime = interviewDetails?.scheduledTime;

        await sendEmail({
          to: updatedCandidate.email,
          candidateName: updatedCandidate.name,
          status: interviewType === "first" ? "interviewRescheduleRejected" : "secondRoundInterviewRescheduleRejected",
          position: updatedCandidate.position,
          companyName: process.env.COMPANY_NAME || "Zairo International",
          interviewDetails: {
            scheduledDate: currentScheduledDate || "",
            scheduledTime: currentScheduledTime || "",
            officeAddress: "117/N/70, Kakadeo Rd, Near Manas Park, Ambedkar Nagar, Navin Nagar, Kakadeo, Kanpur, Uttar Pradesh 208025",
            googleMapsLink: "https://www.google.com/maps/place/Zairo+International+Private+Limited/@26.4774594,80.294648,19.7z/data=!4m14!1m7!3m6!1s0x399c393b0d80423f:0x5a0054d06432272d!2sZairo+International+Private+Limited!8m2!3d26.477824!4d80.2947677!16s%2Fg%2F11w8pj2ggg!3m5!1s0x399c393b0d80423f:0x5a0054d06432272d!8m2!3d26.477824!4d80.2947677!16s%2Fg%2F11w8pj2ggg?entry=ttu&g_ep=EgoyMDI1MTIwOS4wIKXMDSoASAFQAw%3D%3D",
          },
        });
        console.log(`✅ Reschedule rejection email sent successfully to ${updatedCandidate.email}`);
      } catch (emailError: any) {
        console.error(`❌ Failed to send reschedule rejection email to ${updatedCandidate.email}:`, emailError);
        // Continue even if email fails
      }

      return NextResponse.json({
        success: true,
        message: "Reschedule request rejected",
        data: updatedCandidate,
      });
    }
  } catch (error: any) {
    console.error("Approve reschedule error:", error);
    if (error.message === "Token Expired") {
      return NextResponse.json(
        { success: false, error: "Authentication expired" },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to process reschedule request" },
      { status: 500 }
    );
  }
}

