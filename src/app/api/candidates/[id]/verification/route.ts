import Candidate from "@/models/candidate";
import Employee from "@/models/employee";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { type NextRequest, NextResponse } from "next/server";

// Document types that can be verified
const DOCUMENT_TYPES = [
  "aadharCard",
  "panCard",
  "highSchoolMarksheet",
  "interMarksheet",
  "graduationMarksheet",
  "experienceLetter",
  "relievingLetter",
  "salarySlips",
] as const;

type DocumentType = (typeof DOCUMENT_TYPES)[number];

// Verify/Unverify a specific document
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDb();

  try {
    // Check authentication and role
    const token = await getDataFromToken(request);
    const userRole = token.role as string;
    const userId = token.id as string;
    let userName = token.name as string;

    if (!["HR", "SuperAdmin"].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Only HR and SuperAdmin can verify documents." },
        { status: 403 }
      );
    }

    // Fetch employee name from database if not in token
    if (!userName && userId) {
      const employee = await Employee.findById(userId).select("name");
      userName = employee?.name || "HR Team";
    }

    const { id } = await params;
    const body = await request.json();
    const { documentType, verified } = body;

    // Validate document type
    if (!DOCUMENT_TYPES.includes(documentType as DocumentType)) {
      return NextResponse.json(
        { success: false, error: "Invalid document type" },
        { status: 400 }
      );
    }

    // Validate verified is boolean
    if (typeof verified !== "boolean") {
      return NextResponse.json(
        { success: false, error: "verified must be a boolean" },
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

    // Check if document exists
    const documentValue = candidate.onboardingDetails?.documents?.[documentType];
    
    if (!documentValue || (Array.isArray(documentValue) && documentValue.length === 0)) {
      return NextResponse.json(
        { success: false, error: "Document not found or not uploaded" },
        { status: 400 }
      );
    }

    // Update verification status with human-readable verifier name and role
    const verifierDisplay = verified ? `${userName || "HR Team"} (${userRole})` : null;
    const updateData: Record<string, unknown> = {
      [`onboardingDetails.documentVerification.${documentType}.verified`]: verified,
      [`onboardingDetails.documentVerification.${documentType}.verifiedBy`]: verifierDisplay,
      [`onboardingDetails.documentVerification.${documentType}.verifiedAt`]: verified ? new Date() : null,
    };

    const updatedCandidate = await Candidate.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    if (!updatedCandidate) {
      return NextResponse.json(
        { success: false, error: "Failed to update verification status" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedCandidate,
      message: `Document ${verified ? "verified" : "unverified"} successfully`,
    });
  } catch (error: any) {
    console.error("Verification error:", error);
    if (error.message === "Token Expired") {
      return NextResponse.json(
        { success: false, error: "Authentication expired" },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to update verification status" },
      { status: 500 }
    );
  }
}

