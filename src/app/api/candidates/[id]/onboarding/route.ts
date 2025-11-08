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

    // Salary slips come as JSON-stringified array
    let salarySlips = [];
    try {
      salarySlips = JSON.parse(formData.get("salarySlips") as string);
    } catch {
      salarySlips = [];
    }

    const documents = {
      aadharCard: formData.get("aadharCard") || null,
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

    // Update candidate
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

          "onboardingDetails.termsAccepted": termsAccepted,
          "onboardingDetails.termsAcceptedAt": new Date(),

          "onboardingDetails.onboardingComplete": true,
          "onboardingDetails.completedAt": new Date(),

          // Save signed PDF URL too
          "onboardingDetails.signedPdfUrl":
            formData.get("signedPdfUrl") || null,
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
