import Candidate from "@/models/candidate";
import { connectDb } from "@/util/db";
import { type NextRequest, NextResponse } from "next/server";

// POST: Submit re-signed onboarding agreement
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDb();

  try {
    const { id } = await params;
    const body = await request.json();
    const { signedPdfUrl, signatureImage, resignatureToken } = body;

    // Validate input
    if (!resignatureToken) {
      return NextResponse.json(
        { success: false, error: "Re-signature token is required" },
        { status: 400 }
      );
    }

    if (!signedPdfUrl) {
      return NextResponse.json(
        { success: false, error: "Signed PDF URL is required" },
        { status: 400 }
      );
    }

    if (!signatureImage) {
      return NextResponse.json(
        { success: false, error: "Signature image is required" },
        { status: 400 }
      );
    }

    // Find candidate
    const candidate = await Candidate.findById(id);
    if (!candidate) {
      return NextResponse.json(
        { success: false, error: "Candidate not found" },
        { status: 404 }
      );
    }

    // Validate resignature token
    const resignatureRequest = candidate.onboardingDetails?.resignatureRequest;
    if (!resignatureRequest) {
      return NextResponse.json(
        { success: false, error: "Re-signature request not found" },
        { status: 404 }
      );
    }

    if (resignatureRequest.token !== resignatureToken) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 400 }
      );
    }

    if (new Date() > new Date(resignatureRequest.tokenExpiresAt)) {
      return NextResponse.json(
        { success: false, error: "Token has expired" },
        { status: 400 }
      );
    }

    if (!resignatureRequest.isActive) {
      return NextResponse.json(
        { success: false, error: "Re-signature request is no longer active" },
        { status: 400 }
      );
    }

    // Update candidate with re-signed document
    const updatedCandidate = await Candidate.findByIdAndUpdate(
      id,
      {
        $set: {
          "onboardingDetails.signedPdfUrl": signedPdfUrl,
          "onboardingDetails.eSign.signatureImage": signatureImage,
          "onboardingDetails.eSign.signedAt": new Date(),
          "onboardingDetails.resignatureRequest.isActive": false,
          "onboardingDetails.resignatureRequest.completedAt": new Date(),
        },
      },
      { new: true }
    );

    if (!updatedCandidate) {
      return NextResponse.json(
        { success: false, error: "Failed to update candidate" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedCandidate,
      message: "Onboarding agreement re-signed successfully",
    });
  } catch (error) {
    console.error("Error submitting re-signed onboarding agreement:", error);
    return NextResponse.json(
      { success: false, error: "Failed to submit re-signed document" },
      { status: 500 }
    );
  }
}

