import Candidate from "@/models/candidate";
import Employee from "@/models/employee";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { type NextRequest, NextResponse } from "next/server";

// Document types that can be verified
const DOCUMENT_TYPES = [
  "aadharCard", // Backward compatibility
  "aadharCardFront",
  "aadharCardBack",
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

    // Log received data for debugging
    console.log("Verification request:", { candidateId: id, documentType, verified });

    // Validate document type
    if (!DOCUMENT_TYPES.includes(documentType as DocumentType)) {
      console.error("Invalid document type:", documentType, "Valid types:", DOCUMENT_TYPES);
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid document type: "${documentType}". Valid types: ${DOCUMENT_TYPES.join(", ")}` 
        },
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
    // Handle backward compatibility: if checking aadharCardFront/Back but only old aadharCard exists
    let documentValue = candidate.onboardingDetails?.documents?.[documentType];
    
    // Backward compatibility: if requesting aadharCardFront/Back but only old aadharCard exists
    if ((documentType === "aadharCardFront" || documentType === "aadharCardBack") && !documentValue) {
      const oldAadharCard = candidate.onboardingDetails?.documents?.aadharCard;
      if (oldAadharCard) {
        // Allow verification of front/back even if only old aadharCard exists
        documentValue = oldAadharCard;
        console.log("Using backward compatibility: old aadharCard found for", documentType);
      }
    }
    
    // Also handle reverse: if requesting old aadharCard but only new ones exist
    if (documentType === "aadharCard" && !documentValue) {
      const hasNewAadhar = candidate.onboardingDetails?.documents?.aadharCardFront || 
                          candidate.onboardingDetails?.documents?.aadharCardBack;
      if (hasNewAadhar) {
        // Don't allow verification of old aadharCard if new ones exist
        console.error("Cannot verify old aadharCard when new aadharCardFront/Back exists");
        return NextResponse.json(
          { 
            success: false, 
            error: "Cannot verify 'aadharCard' when 'aadharCardFront' or 'aadharCardBack' exists. Please verify the front and back separately." 
          },
          { status: 400 }
        );
      }
    }
    
    if (!documentValue || (Array.isArray(documentValue) && documentValue.length === 0)) {
      console.error("Document not found:", { documentType, candidateId: id });
      return NextResponse.json(
        { success: false, error: `Document "${documentType}" not found or not uploaded` },
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

