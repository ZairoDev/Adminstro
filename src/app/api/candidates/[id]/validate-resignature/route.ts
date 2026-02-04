import Candidate from "@/models/candidate";
import { connectDb } from "@/util/db";
import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDb();

  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    const agreementType = searchParams.get("agreementType") as "training" | "onboarding";

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Token is required" },
        { status: 400 }
      );
    }

    if (!agreementType || !["training", "onboarding"].includes(agreementType)) {
      return NextResponse.json(
        { success: false, error: "Invalid agreement type" },
        { status: 400 }
      );
    }

    const candidate = await Candidate.findById(id);
    if (!candidate) {
      return NextResponse.json(
        { success: false, error: "Candidate not found" },
        { status: 404 }
      );
    }

    const resignatureRequest = agreementType === "training"
      ? candidate.trainingAgreementDetails?.resignatureRequest
      : candidate.onboardingDetails?.resignatureRequest;

    // Debug: log the actual data
    console.log("=== VALIDATE RESIGNATURE DEBUG ===");
    console.log("Agreement type:", agreementType);
    console.log("Candidate ID:", id);
    console.log("onboardingDetails:", JSON.stringify(candidate.onboardingDetails, null, 2));
    console.log("resignatureRequest:", JSON.stringify(resignatureRequest, null, 2));

    if (!resignatureRequest) {
      console.error(`Resignature request not found for candidate ${id}, agreementType: ${agreementType}`);
      console.error(`Candidate onboardingDetails exists: ${!!candidate.onboardingDetails}`);
      console.error(`Candidate trainingAgreementDetails exists: ${!!candidate.trainingAgreementDetails}`);
      return NextResponse.json(
        { success: false, valid: false, error: "Re-signature request not found. Please request a new re-signature link from HR." },
        { status: 404 }
      );
    }

    // Check if token matches
    if (resignatureRequest.token !== token) {
      return NextResponse.json(
        { success: false, valid: false, error: "Invalid token" },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (new Date() > new Date(resignatureRequest.tokenExpiresAt)) {
      return NextResponse.json(
        { success: false, valid: false, error: "Token has expired", expired: true },
        { status: 400 }
      );
    }

    // Check if request is active
    if (!resignatureRequest.isActive) {
      return NextResponse.json(
        { success: false, valid: false, error: "Re-signature request is no longer active" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      valid: true,
      data: {
        agreementType,
        reason: resignatureRequest.reason,
        requestedBy: resignatureRequest.requestedBy,
        requestedAt: resignatureRequest.requestedAt,
      },
    });
  } catch (error) {
    console.error("Error validating re-signature token:", error);
    return NextResponse.json(
      { success: false, error: "Failed to validate token" },
      { status: 500 }
    );
  }
}

