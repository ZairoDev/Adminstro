
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

    console.log("Received onboarding data for candidate ID:", formData);

    // Get text fields
    const personalDetails = JSON.parse(
      formData.get("personalDetails") as string
    );
    const bankDetails = JSON.parse(formData.get("bankDetails") as string);
    const termsAccepted = formData.get("termsAccepted") === "true";

    // In a real application, you would upload these files to cloud storage (Vercel Blob, AWS S3, etc.)
    // For now, we'll store file names and metadata
    const documents = {
      aadharCard: formData.get("aadharCard")
        ? (formData.get("aadharCard") as File).name
        : null,
      panCard: formData.get("panCard")
        ? (formData.get("panCard") as File).name
        : null,
      highSchoolMarksheet: formData.get("highSchoolMarksheet")
        ? (formData.get("highSchoolMarksheet") as File).name
        : null,
      interMarksheet: formData.get("interMarksheet")
        ? (formData.get("interMarksheet") as File).name
        : null,
      graduationMarksheet: formData.get("graduationMarksheet")
        ? (formData.get("graduationMarksheet") as File).name
        : null,
    };

    const eSign = {
      signatureImage: formData.get("signature")
        ? (formData.get("signature") as File).name
        : null,
      signedAt: new Date(),
    };

    // Update candidate
    const candidate = await Candidate.findByIdAndUpdate(
      id,
      {
        $set: {
          "onboardingDetails.personalDetails": personalDetails,
          "onboardingDetails.bankDetails": bankDetails,
          "onboardingDetails.documents": documents,
          "onboardingDetails.eSign": eSign,
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
