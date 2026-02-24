import Candidate from "@/models/candidate";
import { connectDb } from "@/util/db";
import { type NextRequest, NextResponse } from "next/server";
import { createTransporterHR, DEFAULT_FROM_EMAIL } from "@/lib/email/transporter";
import { getActiveHREmployee } from "@/lib/email/getHREmployee";
import { getEmailSignature } from "@/lib/email/signature";

// PATCH: Handle document re-uploads
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDb();

  try {
    const { id } = await params;
    const body = await request.json();
    const { documents, reuploadToken } = body;



    // Validate input
    if (!reuploadToken) {
      console.error("Missing re-upload token");
      return NextResponse.json(
        { success: false, error: "Re-upload token is required" },
        { status: 400 }
      );
    }

    if (!documents || Object.keys(documents).length === 0) {
      console.error("No documents provided");
      return NextResponse.json(
        { success: false, error: "No documents provided for re-upload" },
        { status: 400 }
      );
    }

    // Validate re-upload token
    const candidate = await Candidate.findById(id);
    if (!candidate) {
      console.error("Candidate not found:", id);
      return NextResponse.json(
        { success: false, error: "Candidate not found" },
        { status: 404 }
      );
    }


    
    const reuploadRequest = candidate.onboardingDetails?.reuploadRequest;

    
    if (!reuploadRequest) {
      console.error("No reuploadRequest found in candidate data");
      return NextResponse.json(
        { success: false, error: "No re-upload request found. Please contact HR to request a new re-upload link." },
        { status: 400 }
      );
    }

    if (!reuploadRequest.isActive) {
      console.error("Re-upload request is not active. Completed:", !!reuploadRequest.completedAt);
      return NextResponse.json(
        { success: false, error: reuploadRequest.completedAt 
          ? "This re-upload request has already been completed." 
          : "No active re-upload request found. Please contact HR for a new link." },
        { status: 400 }
      );
    }

    // Validate token


    if (reuploadRequest.token !== reuploadToken) {
      console.error("Token mismatch");
      return NextResponse.json(
        { success: false, error: "Invalid re-upload token. Please use the link from your email." },
        { status: 403 }
      );
    }

    // Check if token is expired
    if (reuploadRequest.tokenExpiresAt) {
      const tokenExpiry = new Date(reuploadRequest.tokenExpiresAt);
      const now = new Date();

      
      if (tokenExpiry < now) {
        console.error("Token expired");
        return NextResponse.json(
          { success: false, error: "Re-upload link has expired. Please contact HR for a new link." },
          { status: 400 }
        );
      }
    }

    // Validate that only requested documents are being re-uploaded
    const requestedDocs = reuploadRequest.requestedDocuments || [];
    const submittedDocs = Object.keys(documents);
    const invalidDocs = submittedDocs.filter((doc) => !requestedDocs.includes(doc));
    

    
    if (invalidDocs.length > 0) {
      console.error("Invalid documents submitted:", invalidDocs);
      return NextResponse.json(
        { success: false, error: `Cannot re-upload documents not requested: ${invalidDocs.join(", ")}` },
        { status: 400 }
      );
    }

    // Check if all requested documents are provided
    const missingDocs = requestedDocs.filter((doc: string) => !submittedDocs.includes(doc));
    if (missingDocs.length > 0) {
      console.error("Missing requested documents:", missingDocs);
      return NextResponse.json(
        { success: false, error: `Please upload all requested documents. Missing: ${missingDocs.join(", ")}` },
        { status: 400 }
      );
    }

    // Prepare update operations
    const updateOps: Record<string, any> = {};
    const reuploadHistoryEntries: any[] = [];

    // Update documents and reset verification status
    for (const docKey of submittedDocs) {
      if (documents[docKey]) {
        // Get previous URL for audit history
        const previousUrl = candidate.onboardingDetails?.documents?.[docKey as keyof typeof candidate.onboardingDetails.documents];
        
        // Add to reupload history
        reuploadHistoryEntries.push({
          documentType: docKey,
          previousUrl: previousUrl || null,
          newUrl: documents[docKey],
          reuploadedAt: new Date(),
          requestedBy: reuploadRequest.requestedBy,
        });

        // Update document
        updateOps[`onboardingDetails.documents.${docKey}`] = documents[docKey];
        
        // Reset verification status for this document
        updateOps[`onboardingDetails.documentVerification.${docKey}`] = {
          verified: false,
          verifiedBy: null,
          verifiedAt: null,
        };
      }
    }

    // Mark re-upload request as complete
    updateOps["onboardingDetails.reuploadRequest.isActive"] = false;
    updateOps["onboardingDetails.reuploadRequest.completedAt"] = new Date();


    // Update candidate
    const updatedCandidate = await Candidate.findByIdAndUpdate(
      id,
      {
        $set: updateOps,
        $push: {
          "onboardingDetails.reuploadHistory": { $each: reuploadHistoryEntries },
        },
      },
      { new: true }
    );

    if (!updatedCandidate) {
      console.error("Failed to update candidate - update returned null");
      return NextResponse.json(
        { success: false, error: "Failed to update documents. Please try again." },
        { status: 500 }
      );
    }


    // Send notification email to HR
    try {
      const hrEmployee = await getActiveHREmployee();
      const transporter = createTransporterHR();
      const baseUrl = process.env.APP_URL || "http://localhost:3000";
      const candidateUrl = `${baseUrl}/dashboard/candidatePortal/${id}`;

      const documentListHtml = submittedDocs
        .map((docKey) => {
          const labels: Record<string, string> = {
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
          return `<li style="margin: 8px 0;">${labels[docKey] || docKey}</li>`;
        })
        .join("");

      const emailHtml = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Documents Re-uploaded ✓</h1>
          </div>
          
          <div style="padding: 40px 30px; color: #333; line-height: 1.8;">
            <p style="font-size: 18px; color: #1f2937; margin-bottom: 20px;">Hello HR Team,</p>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              <strong>${candidate.name}</strong> has re-uploaded the requested documents and they are now ready for review.
            </p>
            
            <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 30px 0; border-radius: 4px;">
              <p style="margin: 0 0 15px 0; font-size: 16px; color: #065f46;">
                <strong>📋 Re-uploaded Documents:</strong>
              </p>
              <ul style="margin: 0; padding-left: 20px; color: #047857;">
                ${documentListHtml}
              </ul>
            </div>
            
            <div style="text-align: center; margin: 35px 0;">
              <a href="${candidateUrl}" 
                 style="display: inline-block; background: #10b981; color: #ffffff; padding: 16px 40px; 
                        border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;
                        box-shadow: 0 4px 6px rgba(16, 185, 129, 0.2); transition: all 0.3s;">
                Review Documents Now
              </a>
            </div>
            
            <p style="font-size: 15px; margin-top: 25px;">
              Please verify the re-uploaded documents at your earliest convenience.
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

      // Send to HR email
      if (hrEmployee?.email) {
        const mailResponse = await transporter.sendMail({
          from: `"Zairo International System" <${DEFAULT_FROM_EMAIL}>`,
          to: hrEmployee.email,
          subject: `Documents Re-uploaded - ${candidate.name}`,
          html: emailHtml,
        });

      }
    } catch (emailError: any) {
      console.error("❌ Failed to send HR notification email:", emailError.message || emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      data: updatedCandidate,
      message: "Documents re-uploaded successfully. HR has been notified.",
    });
  } catch (error: any) {
    console.error("❌ Re-upload error:", error);
    console.error("Error stack:", error.stack);
    const errorMessage = error.message || "Failed to re-upload documents. Please try again or contact HR.";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

// POST: Initial onboarding submission
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDb();

  try {
    const { id } = await params;
    const formData = await request.formData();



    // Parse text fields
    const personalDetailsRaw = formData.get("personalDetails") as string;
    const bankDetailsRaw = formData.get("bankDetails") as string;

    const personalDetails = JSON.parse(personalDetailsRaw);
    const bankDetails = JSON.parse(bankDetailsRaw);

    // Handle fatherName inside personalDetails
    const fatherName = personalDetails.fatherName || null;

    // Parse experience data - critical for persistence
    const yearsOfExperience = formData.get("yearsOfExperience") as string || null;
    let companies = [];
    try {
      const companiesRaw = formData.get("companies") as string;
      if (companiesRaw) {
        companies = JSON.parse(companiesRaw);
        // Transform companies array to match schema structure
        // Remove frontend-only 'id' field and ensure proper structure
        companies = companies.map((company: any) => ({
          companyName: company.companyName || null,
          yearsInCompany: company.yearsInCompany || null,
          experienceLetter: company.experienceLetter?.url || company.experienceLetter || null,
          relievingLetter: company.relievingLetter?.url || company.relievingLetter || null,
          salarySlip: company.salarySlip?.url || company.salarySlip || null,
          hrPhone: company.hrPhone || null,
          hrEmail: company.hrEmail || null,
        }));
      }
    } catch (error) {
      console.error("Error parsing companies data:", error);
      companies = [];
    }

    // Salary slips come as JSON-stringified array
    let salarySlips = [];
    try {
      salarySlips = JSON.parse(formData.get("salarySlips") as string);
    } catch {
      salarySlips = [];
    }

    const documents = {
      // aadharCard: formData.get("aadharCard") || null,
      aadharCardFront: formData.get("aadharCardFront") || formData.get("aadharCard") || null,
      aadharCardBack: formData.get("aadharCardBack") || null,
      panCard: formData.get("panCard") || null,
      highSchoolMarksheet: formData.get("highSchoolMarksheet") || null,
      interMarksheet: formData.get("interMarksheet") || null,
      graduationMarksheet: formData.get("graduationMarksheet") || null,
      experienceLetter: formData.get("experienceLetter") || null,
      relievingLetter: formData.get("relievingLetter") || null,
      salarySlips: salarySlips,
    };

    // eSign (URLs, not files)
    const eSign = {
      signatureImage: formData.get("signature") || null,
      signedAt: new Date(),
    };

    const termsAccepted = formData.get("termsAccepted") === "true";

    // Get signed PDF URL - this becomes the authoritative document after signing
    const signedPdfUrl = (formData.get("signedPdfUrl") as string) || null;

    // Get Aadhaar and PAN numbers from personalDetails
    const aadhaarNumber = personalDetails.aadhaarNumber || null;
    const panNumber = personalDetails.panNumber || null;

    // Update candidate with all onboarding data including experience
    const candidate = await Candidate.findByIdAndUpdate(
      id,
      {
        $set: {
          "onboardingDetails.personalDetails": {
            dateOfBirth: personalDetails.dateOfBirth,
            gender: personalDetails.gender,
            nationality: personalDetails.nationality,
            fatherName: fatherName,
            aadhaarNumber: aadhaarNumber,
            panNumber: panNumber,
          },

          "onboardingDetails.bankDetails": bankDetails,

          "onboardingDetails.documents": documents,

          "onboardingDetails.eSign": eSign,

          // Experience data - persist exactly as submitted
          "onboardingDetails.yearsOfExperience": yearsOfExperience,
          "onboardingDetails.companies": companies,

          // Signed PDF URL - authoritative source after signing
          // Once set, this should always be used instead of unsigned PDF
          "onboardingDetails.signedPdfUrl": signedPdfUrl,

          "onboardingDetails.termsAccepted": termsAccepted,
          "onboardingDetails.termsAcceptedAt": new Date(),

          "onboardingDetails.onboardingComplete": true,
          "onboardingDetails.completedAt": new Date(),
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
      data: candidate,
      message: "Onboarding completed successfully",
    });
  } catch (error) {
    console.error("Onboarding error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to complete onboarding" },
      { status: 500 }
    );
  }
}
