import Candidate from "@/models/candidate";
import { connectDb } from "@/util/db";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDb();

  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Re-upload token is required" },
        { status: 400 }
      );
    }

    const candidate = await Candidate.findById(id);

    if (!candidate) {
      console.log("Candidate not found:", id);
      return NextResponse.json(
        { success: false, error: "Candidate not found" },
        { status: 404 }
      );
    }

    console.log("Candidate found, checking reuploadRequest...");
    console.log("onboardingDetails exists:", !!candidate.onboardingDetails);
    console.log("Full onboardingDetails:", JSON.stringify(candidate.onboardingDetails, null, 2));
    
    const reuploadRequest = candidate.onboardingDetails?.reuploadRequest;
    
    console.log("reuploadRequest exists:", !!reuploadRequest);
    if (reuploadRequest) {
      console.log("reuploadRequest data:", JSON.stringify(reuploadRequest, null, 2));
    }

    // Check if re-upload request exists
    if (!reuploadRequest) {
      console.log("No reuploadRequest found in candidate data");
      return NextResponse.json({
        success: false,
        error: "No re-upload request found for this candidate",
        valid: false,
      });
    }

    if (!reuploadRequest.token) {
      console.log("reuploadRequest exists but token is missing");
      return NextResponse.json({
        success: false,
        error: "Re-upload request found but token is missing",
        valid: false,
      });
    }

    console.log("Token comparison:", {
      storedToken: reuploadRequest.token,
      providedToken: token,
      tokensMatch: reuploadRequest.token === token,
    });

    // Check if token matches
    if (reuploadRequest.token !== token) {
      return NextResponse.json({
        success: false,
        error: "Invalid re-upload token",
        valid: false,
      });
    }

    // Check if already completed
    if (!reuploadRequest.isActive && reuploadRequest.completedAt) {
      return NextResponse.json({
        success: true,
        valid: true,
        completed: true,
        data: {
          requestedDocuments: reuploadRequest.requestedDocuments || [],
          reason: reuploadRequest.reason || null,
          completedAt: reuploadRequest.completedAt,
        },
      });
    }

    // Check if expired
    if (reuploadRequest.tokenExpiresAt) {
      const tokenExpiry = new Date(reuploadRequest.tokenExpiresAt);
      if (tokenExpiry <= new Date()) {
        return NextResponse.json({
          success: false,
          error: "Re-upload link has expired",
          valid: false,
          expired: true,
        });
      }
    }

    // Check if active
    if (!reuploadRequest.isActive) {
      return NextResponse.json({
        success: false,
        error: "Re-upload request is not active",
        valid: false,
      });
    }

    // Valid and active
    return NextResponse.json({
      success: true,
      valid: true,
      completed: false,
      data: {
        requestedDocuments: reuploadRequest.requestedDocuments || [],
        reason: reuploadRequest.reason || null,
        requestedAt: reuploadRequest.requestedAt,
        requestedBy: reuploadRequest.requestedBy,
        tokenExpiresAt: reuploadRequest.tokenExpiresAt,
      },
    });
  } catch (error: any) {
    console.error("Error validating re-upload token:", error);
    return NextResponse.json(
      { success: false, error: "Failed to validate re-upload token" },
      { status: 500 }
    );
  }
}

