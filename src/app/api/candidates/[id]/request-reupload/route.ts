import Candidate from "@/models/candidate";
import Employee from "@/models/employee";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { type NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createTransporterHR, DEFAULT_FROM_EMAIL } from "@/lib/email/transporter";
import { getActiveHREmployee } from "@/lib/email/getHREmployee";
import { getEmailSignature } from "@/lib/email/signature";

// Valid document types that can be re-uploaded
const DOCUMENT_TYPES = [
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

const DOCUMENT_LABELS: Record<string, string> = {
  aadharCardFront: "Aadhaar Card - Front",
  aadharCardBack: "Aadhaar Card - Back",
  panCard: "PAN Card",
  highSchoolMarksheet: "High School Marksheet",
  interMarksheet: "Intermediate Marksheet",
  graduationMarksheet: "Graduation Marksheet",
  experienceLetter: "Experience Letter",
  relievingLetter: "Relieving Letter",
  salarySlips: "Salary Slips",
};

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

    // Validate document types
    if (!documentTypes || !Array.isArray(documentTypes) || documentTypes.length === 0) {
      return NextResponse.json(
        { success: false, error: "Please select at least one document to request re-upload" },
        { status: 400 }
      );
    }

    // Validate each document type
    for (const docType of documentTypes) {
      if (!DOCUMENT_TYPES.includes(docType)) {
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

    console.log("Candidate found:", candidate.name);
    console.log("onboardingDetails exists:", !!candidate.onboardingDetails);
    console.log("onboardingComplete:", candidate.onboardingDetails?.onboardingComplete);

    // Check if onboarding is complete
    if (!candidate.onboardingDetails?.onboardingComplete) {
      return NextResponse.json(
        { success: false, error: "Candidate has not completed onboarding yet" },
        { status: 400 }
      );
    }

    // Check if there's already an active re-upload request
    if (candidate.onboardingDetails?.reuploadRequest?.isActive) {
      const existingExpiry = new Date(candidate.onboardingDetails.reuploadRequest.tokenExpiresAt);
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
    console.log("Creating re-upload request for candidate:", id);
    console.log("Token:", secureToken);
    console.log("Expires at:", tokenExpiresAt);
    console.log("Requested documents:", documentTypes);
    
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
    
    console.log("=== VERIFICATION AFTER SAVE ===");
    console.log("Candidate ID:", id);
    console.log("onboardingDetails exists:", !!verifyCandidate?.onboardingDetails);
    console.log("reuploadRequest exists:", !!savedRequest);
    console.log("Saved reuploadRequest:", JSON.stringify(savedRequest, null, 2));
    console.log("Token matches:", savedRequest?.token === secureToken);
    console.log("Is active:", savedRequest?.isActive);
    console.log("Requested documents:", savedRequest?.requestedDocuments);
    console.log("===============================");
    
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
    
    console.log("✅ Re-upload request saved and verified successfully!");

    // Generate re-upload link
    const baseUrl = process.env.APP_URL || "http://localhost:3000";
    const reuploadLink = `${baseUrl}/dashboard/candidatePortal/${id}/onboarding?reupload=${secureToken}`;

    // Send email to candidate
    try {
      const hrEmployee = await getActiveHREmployee();
      const transporter = createTransporterHR();
      
      const documentListHtml = documentTypes
        .map((docType: string) => `<li style="margin: 8px 0;">${DOCUMENT_LABELS[docType] || docType}</li>`)
        .join("");

      const emailHtml = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Document Re-upload Required</h1>
          </div>
          
          <div style="padding: 40px 30px; color: #333; line-height: 1.8;">
            <p style="font-size: 18px; color: #1f2937; margin-bottom: 20px;">Dear ${candidate.name},</p>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              During our review of your onboarding documents, we noticed that some documents require re-upload due to clarity or format issues.
            </p>
            
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 30px 0; border-radius: 4px;">
              <p style="margin: 0 0 15px 0; font-size: 16px; color: #92400e;">
                <strong>📋 Documents requiring re-upload:</strong>
              </p>
              <ul style="margin: 0; padding-left: 20px; color: #78350f;">
                ${documentListHtml}
              </ul>
              ${reason ? `
              <p style="margin: 15px 0 0 0; font-size: 14px; color: #92400e;">
                <strong>Reason:</strong> ${reason}
              </p>
              ` : ""}
            </div>
            
            <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 25px 0; border-radius: 4px;">
              <p style="margin: 0; font-size: 15px; color: #1e40af;">
                <strong>💡 Tips for better document uploads:</strong><br/>
                • Take photos in portrait mode with good lighting<br/>
                • Ensure all text is clearly visible and not blurred<br/>
                • Avoid shadows or glare on the document<br/>
                • Make sure the entire document is visible in the frame
              </p>
            </div>
            
            <div style="text-align: center; margin: 35px 0;">
              <a href="${reuploadLink}" 
                 style="display: inline-block; background: #f59e0b; color: #ffffff; padding: 16px 40px; 
                        border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;
                        box-shadow: 0 4px 6px rgba(245, 158, 11, 0.2); transition: all 0.3s;">
                Re-upload Documents Now
              </a>
            </div>
            
            <div style="background: #f9fafb; padding: 15px; border-radius: 6px; margin: 25px 0;">
              <p style="font-size: 13px; color: #6b7280; margin: 0;">
                <strong>Having trouble with the button?</strong> Copy and paste this link into your browser:
              </p>
              <p style="font-size: 13px; color: #f59e0b; word-break: break-all; margin: 8px 0 0 0;">
                ${reuploadLink}
              </p>
              <p style="font-size: 12px; color: #9ca3af; margin: 10px 0 0 0;">
                ⏰ This link will expire in 7 days.
              </p>
            </div>
            
            <p style="font-size: 15px; margin-top: 25px;">
              If you have any questions or need assistance, please don't hesitate to reach out to our HR team.
            </p>
            
            ${getEmailSignature(hrEmployee)}
          </div>
          
          <div style="background: #f9fafb; padding: 20px 30px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 12px; color: #6b7280; margin: 0;">
              © ${new Date().getFullYear()} Zairo International. All rights reserved.
            </p>
          </div>
        </div>
      `;

      const mailResponse = await transporter.sendMail({
        from: `"Zairo International HR" <${DEFAULT_FROM_EMAIL}>`,
        to: candidate.email,
        subject: "Document Re-upload Required - Zairo International",
        html: emailHtml,
      });

      console.log("✅ Re-upload email sent successfully to:", candidate.email, "Message ID:", mailResponse.messageId);

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

