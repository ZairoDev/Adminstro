import Candidate from "@/models/candidate";
import Employee from "@/models/employee";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { type NextRequest, NextResponse } from "next/server";

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
    const interviewDate = new Date(scheduledDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (interviewDate < today) {
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
    const updateData: Record<string, unknown> = {
      status: "interview",
      "interviewDetails.scheduledDate": new Date(scheduledDate),
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

