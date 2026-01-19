import Candidate from "@/models/candidate";
import Employee from "@/models/employee";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { type NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createTransporterHR, DEFAULT_FROM_EMAIL } from "@/lib/email/transporter";
import { getActiveHREmployee } from "@/lib/email/getHREmployee";
import { getEmailSignature } from "@/lib/email/signature";

// Valid agreement types that can be re-signed
const AGREEMENT_TYPES = ["training", "onboarding"] as const;

type AgreementType = typeof AGREEMENT_TYPES[number];

// Generate a secure token for the re-signature link
function generateSecureToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// POST: Request agreement re-signature
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
        { success: false, error: "Unauthorized. Only HR and SuperAdmin can request agreement re-signatures." },
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
    const { agreementType, reason } = body;

    // Validate agreement type
    if (!agreementType || !AGREEMENT_TYPES.includes(agreementType)) {
      return NextResponse.json(
        { success: false, error: `Invalid agreement type. Must be one of: ${AGREEMENT_TYPES.join(", ")}` },
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

    // Check if agreement exists and is signed
    if (agreementType === "training") {
      if (!candidate.trainingAgreementDetails?.agreementComplete) {
        return NextResponse.json(
          { success: false, error: "Training agreement is not signed yet" },
          { status: 400 }
        );
      }
    } else if (agreementType === "onboarding") {
      if (!candidate.onboardingDetails?.onboardingComplete) {
        return NextResponse.json(
          { success: false, error: "Onboarding agreement is not signed yet" },
          { status: 400 }
        );
      }
    }

    // Generate secure token
    const tokenValue = generateSecureToken();
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 7); // Expires in 7 days

    // Create re-signature request
    const resignatureRequest = {
      agreementType,
      token: tokenValue,
      tokenExpiresAt,
      requestedBy: userName,
      requestedAt: new Date(),
      reason: reason || null,
      isActive: true,
      emailSentAt: null as Date | null,
    };

    // Update candidate with re-signature request
    const updateField = agreementType === "training" 
      ? "trainingAgreementDetails.resignatureRequest"
      : "onboardingDetails.resignatureRequest";

    console.log("=== REQUEST RESIGNATURE DEBUG ===");
    console.log("Updating field:", updateField);
    console.log("Resignature data:", JSON.stringify(resignatureRequest, null, 2));
    
    // Update the candidate with resignature request
    await Candidate.findByIdAndUpdate(
      id, 
      {
        $set: {
          [updateField]: resignatureRequest,
        },
      }
    );
    
    // Verify by fetching the document again with lean() to get raw MongoDB document
    const verifyCandidate = await Candidate.findById(id).lean();
    
    const savedRequest = agreementType === "training"
      ? (verifyCandidate as any)?.trainingAgreementDetails?.resignatureRequest
      : (verifyCandidate as any)?.onboardingDetails?.resignatureRequest;
    
    console.log("Verified saved resignatureRequest:", JSON.stringify(savedRequest, null, 2));

    // Verify the update was successful
    if (!verifyCandidate) {
      console.error("Failed to find candidate after update");
      return NextResponse.json(
        { success: false, error: "Failed to save re-signature request" },
        { status: 500 }
      );
    }
    
    if (!savedRequest || !savedRequest.token) {
      console.error("Resignature request was not saved properly. Saved data:", savedRequest);
      console.error("Full onboardingDetails:", JSON.stringify((verifyCandidate as any)?.onboardingDetails, null, 2));
      return NextResponse.json(
        { success: false, error: "Re-signature request failed to save to database" },
        { status: 500 }
      );
    }

    // Generate re-signature link
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const resignatureLink = `${baseUrl}/dashboard/candidatePortal/${id}/${
      agreementType === "training" ? "training-agreement" : "onboarding"
    }?resignature=${tokenValue}`;

    // Send email to candidate
    try {
      const hrEmployee = await getActiveHREmployee();
      const hrEmail = hrEmployee?.email || DEFAULT_FROM_EMAIL;
      const hrName = hrEmployee?.name || "HR Team";

      const transporter = await createTransporterHR();
      const emailSignature = await getEmailSignature(hrEmployee);

      const agreementName = agreementType === "training" 
        ? "Training Agreement" 
        : "Onboarding Agreement";

      await transporter.sendMail({
        from: `"${hrName}" <${hrEmail}>`,
        to: candidate.email,
        subject: `Action Required: Re-sign ${agreementName}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Re-sign ${agreementName}</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">Action Required: Re-sign ${agreementName}</h1>
            </div>
            
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
              <p>Dear ${candidate.name},</p>
              
              <p>We need you to re-sign your ${agreementName}. Please click the button below to access the re-signature page:</p>
              
              ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resignatureLink}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                  Re-sign ${agreementName}
                </a>
              </div>
              
              <p style="font-size: 12px; color: #666; margin-top: 30px;">
                <strong>Important:</strong> This link will expire in 7 days. If you have any questions, please contact HR.
              </p>
              
              <p style="font-size: 12px; color: #666;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${resignatureLink}" style="color: #667eea; word-break: break-all;">${resignatureLink}</a>
              </p>
            </div>
            
            ${emailSignature}
          </body>
          </html>
        `,
      });

      // Update email sent timestamp
      await Candidate.findByIdAndUpdate(id, {
        $set: {
          [`${updateField}.emailSentAt`]: new Date(),
        },
      });

      console.log(`✅ Re-signature email sent to ${candidate.email}`);
    } catch (emailError) {
      console.error("Error sending re-signature email:", emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      data: {
        resignatureLink,
        token: tokenValue,
        expiresAt: tokenExpiresAt,
      },
      message: "Re-signature request created successfully",
    });
  } catch (error) {
    console.error("Error requesting re-signature:", error);
    return NextResponse.json(
      { success: false, error: "Failed to request re-signature" },
      { status: 500 }
    );
  }
}

// DELETE: Cancel re-signature request
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDb();

  try {
    const token = await getDataFromToken(request);
    const userRole = token.role as string;

    if (!["HR", "SuperAdmin"].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const agreementType = searchParams.get("agreementType") as AgreementType;

    if (!agreementType || !AGREEMENT_TYPES.includes(agreementType)) {
      return NextResponse.json(
        { success: false, error: "Invalid agreement type" },
        { status: 400 }
      );
    }

    const updateField = agreementType === "training" 
      ? "trainingAgreementDetails.resignatureRequest"
      : "onboardingDetails.resignatureRequest";

    await Candidate.findByIdAndUpdate(id, {
      $unset: {
        [updateField]: "",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Re-signature request cancelled",
    });
  } catch (error) {
    console.error("Error cancelling re-signature request:", error);
    return NextResponse.json(
      { success: false, error: "Failed to cancel re-signature request" },
      { status: 500 }
    );
  }
}

