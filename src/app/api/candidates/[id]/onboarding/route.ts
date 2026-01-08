import Candidate from "@/models/candidate";
import { connectDb } from "@/util/db";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDb();

  try {
    const { id } = await params;
    const formData = await request.formData();

    console.log("Received onboarding data:", formData);

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
