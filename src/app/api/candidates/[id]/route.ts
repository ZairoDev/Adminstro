
import Candidate from "@/models/candidate";
import { connectDb } from "@/util/db";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDb();

  try {
    const { id } = await params;
    const candidate = await Candidate.findById(id);

    if (!candidate) {
      return NextResponse.json(
        { success: false, error: "Candidate not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: candidate });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch candidate" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDb();

  try {
    const { id } = await params;
    const body = await request.json();

    // Build update object supporting nested fields (dot notation)
    const updateData: Record<string, any> = {};
    
    // Handle flat fields
    if (body.status) updateData.status = body.status;
    if (body.position) updateData.position = body.position;
    if (body.isImportant !== undefined) updateData.isImportant = body.isImportant;
    if (body.interviewAttendance !== undefined) {
      // Validate interviewAttendance value
      if (body.interviewAttendance === null || 
          body.interviewAttendance === "appeared" || 
          body.interviewAttendance === "not_appeared") {
        updateData.interviewAttendance = body.interviewAttendance;
      }
    }
    // Handle additionalDocuments array
    if (body.additionalDocuments !== undefined) {
      updateData.additionalDocuments = body.additionalDocuments;
    }
    
    // Handle nested fields using dot notation (e.g., "trainingAgreementDetails.signedHrPoliciesPdfUrl")
    Object.keys(body).forEach((key) => {
      if (key.includes(".")) {
        updateData[key] = body[key];
      }
    });

    const candidate = await Candidate.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    if (!candidate) {
      return NextResponse.json(
        { success: false, error: "Candidate not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: candidate });
  } catch (error) {
    console.error("Error updating candidate:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update candidate" },
      { status: 500 }
    );
  }
}
