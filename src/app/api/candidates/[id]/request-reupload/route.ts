import Candidate from "@/models/candidate";
import Employee from "@/models/employee";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { type NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { sendCustomEmail } from "@/lib/email";
import { getActiveHREmployee } from "@/lib/email/getHREmployee";
import { hasCustomEmail, readCustomEmailFields } from "@/lib/email/customEmailFields";
import { getReuploadEmailTemplate } from "@/lib/email/templates/reupload";
import {
  getOnboardingDocumentLabel,
  isOnboardingReuploadDocumentKey,
} from "@/lib/people/onboarding-documents";

// Generate a secure token for the re-upload link
function generateSecureToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// POST: Request document re-upload
export async function POST(
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
        { success: false, error: "Unauthorized. Only HR and SuperAdmin can request document re-uploads." },
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
    const { documentTypes, reason } = body;
    const customEmail = readCustomEmailFields(body);

    // Validate document types
    if (!documentTypes || !Array.isArray(documentTypes) || documentTypes.length === 0) {
      return NextResponse.json(
        { success: false, error: "Please select at least one document to request re-upload" },
        { status: 400 }
      );
    }

    // Validate each document type
    for (const docType of documentTypes) {
      if (typeof docType !== "string" || !isOnboardingReuploadDocumentKey(docType)) {
        return NextResponse.json(
          { success: false, error: `Invalid document type: ${docType}` },
          { status: 400 }
        );
      }
    }

    // Check if candidate exists
    const candidate = await Candidate.findById(id);
    if (!candidate) {
      console.error("Candidate not found:", id);
      return NextResponse.json(
        { success: false, error: "Candidate not found" },
        { status: 404 }
      );
    }



    // Check if onboarding is complete
    if (!candidate.onboardingDetails?.onboardingComplete) {
      return NextResponse.json(
        { success: false, error: "Candidate has not completed onboarding yet" },
        { status: 400 }
      );
    }

    // Check if there's already an active re-upload request
    if (candidate.onboardingDetails?.reuploadRequest?.isActive) {
      const expiresAt = candidate?.onboardingDetails?.reuploadRequest?.tokenExpiresAt;
      const existingExpiry = expiresAt ? new Date(expiresAt) : new Date(0);
      if (existingExpiry > new Date()) {
        return NextResponse.json(
          { 
            success: false, 
            error: "There is already an active re-upload request for this candidate. Please wait for it to expire or be completed." 
          },
          { status: 400 }
        );
      }
    }

    // Generate secure token and set expiry (7 days)
    const secureToken = generateSecureToken();
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 7);

    // Update candidate with re-upload request

    
    // Build the complete reuploadRequest object
    const reuploadRequestData = {
      isActive: true,
      requestedDocuments: documentTypes,
      requestedAt: new Date(),
      requestedBy: `${userName} (${userRole})`,
      reason: reason || null,
      token: secureToken,
      tokenExpiresAt: tokenExpiresAt,
      emailSentAt: null,
      completedAt: null,
    };

    // First, ensure onboardingDetails exists
    if (!candidate.onboardingDetails) {
      await Candidate.findByIdAndUpdate(
        id,
        {
          $set: {
            onboardingDetails: {
              onboardingComplete: false,
            },
          },
        },
        { new: true }
      );
    }

    // Now set the entire reuploadRequest object
    const updatedCandidate = await Candidate.findByIdAndUpdate(
      id,
      {
        $set: {
          "onboardingDetails.reuploadRequest": reuploadRequestData,
        },
      },
      { new: true, runValidators: false }
    );

    if (!updatedCandidate) {
      console.error("Failed to update candidate - candidate not found");
      return NextResponse.json(
        { success: false, error: "Failed to create re-upload request" },
        { status: 500 }
      );
    }

    // Verify the data was saved by reading it back immediately
    const verifyCandidate = await Candidate.findById(id);
    const savedRequest = verifyCandidate?.onboardingDetails?.reuploadRequest;
    

    
    if (!savedRequest) {
      console.error("ERROR: Re-upload request was not saved - savedRequest is null/undefined");
      console.error("Full candidate onboardingDetails:", JSON.stringify(verifyCandidate?.onboardingDetails, null, 2));
      return NextResponse.json(
        { success: false, error: "Re-upload request was not saved correctly. Please try again." },
        { status: 500 }
      );
    }
    
    if (!savedRequest.token || savedRequest.token !== secureToken) {
      console.error("ERROR: Token mismatch or missing");
      console.error("Expected token:", secureToken);
      console.error("Saved token:", savedRequest.token);
      return NextResponse.json(
        { success: false, error: "Re-upload request token was not saved correctly. Please try again." },
        { status: 500 }
      );
    }
    
    // console.log("✅ Re-upload request saved and verified successfully!");

    // Generate re-upload link
    const baseUrl = process.env.APP_URL || "http://localhost:3000";
    const reuploadLink = `${baseUrl}/dashboard/candidatePortal/${id}/onboarding?reupload=${secureToken}`;

    // Send email to candidate
    try {
      const hrEmployee = await getActiveHREmployee();
      const documentLabels = documentTypes.map((docType: string) =>
        getOnboardingDocumentLabel(docType),
      );
      const template = hasCustomEmail(customEmail)
        ? {
            subject: customEmail.customEmailSubject,
            // Preview UIs use `reupload=preview`; swap in the real token before send.
            html: customEmail.customEmailHtml.replace(
              /reupload=preview/g,
              `reupload=${secureToken}`,
            ),
          }
        : getReuploadEmailTemplate(
            {
              candidateName: candidate.name,
              documentLabels,
              reuploadLink,
              reason: reason || null,
            },
            hrEmployee,
          );

      await sendCustomEmail(candidate.email, template);

      // Update email sent timestamp
      await Candidate.findByIdAndUpdate(id, {
        $set: {
          "onboardingDetails.reuploadRequest.emailSentAt": new Date(),
        },
      });
    } catch (emailError: any) {
      console.error("❌ Failed to send re-upload email:", emailError.message || emailError);
      // Don't fail the request if email fails - the link is still valid
    }

    return NextResponse.json({
      success: true,
      data: {
        reuploadLink,
        expiresAt: tokenExpiresAt,
        requestedDocuments: documentTypes,
      },
      message: "Re-upload request created and email sent to candidate",
    });
  } catch (error: any) {
    console.error("Re-upload request error:", error);
    if (error.message === "Token Expired") {
      return NextResponse.json(
        { success: false, error: "Authentication expired" },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to create re-upload request" },
      { status: 500 }
    );
  }
}

// GET: Get current re-upload request status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDb();

  try {
    const { id } = await params;

    const candidate = await Candidate.findById(id).select("onboardingDetails.reuploadRequest");
    if (!candidate) {
      return NextResponse.json(
        { success: false, error: "Candidate not found" },
        { status: 404 }
      );
    }

    const reuploadRequest = candidate.onboardingDetails?.reuploadRequest;

    return NextResponse.json({
      success: true,
      data: reuploadRequest || null,
    });
  } catch (error: any) {
    console.error("Error fetching re-upload request:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch re-upload request" },
      { status: 500 }
    );
  }
}

// DELETE: Cancel re-upload request
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDb();

  try {
    // Check authentication and role
    const token = await getDataFromToken(request);
    const userRole = token.role as string;

    if (!["HR", "SuperAdmin"].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Only HR and SuperAdmin can cancel re-upload requests." },
        { status: 403 }
      );
    }

    const { id } = await params;

    const candidate = await Candidate.findByIdAndUpdate(
      id,
      {
        $set: {
          "onboardingDetails.reuploadRequest.isActive": false,
          "onboardingDetails.reuploadRequest.completedAt": new Date(),
        },
      },
      { new: true }
    );

    if (!candidate) {
      return NextResponse.json(
        { success: false, error: "Candidate not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Re-upload request cancelled successfully",
    });
  } catch (error: any) {
    console.error("Error cancelling re-upload request:", error);
    if (error.message === "Token Expired") {
      return NextResponse.json(
        { success: false, error: "Authentication expired" },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to cancel re-upload request" },
      { status: 500 }
    );
  }
}

