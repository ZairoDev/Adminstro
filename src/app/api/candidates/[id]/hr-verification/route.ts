import Candidate from "@/models/candidate";
import Employee from "@/models/employee";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { type NextRequest, NextResponse } from "next/server";

// Verify/Unverify overall HR status
export async function PATCH(
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
        { success: false, error: "Unauthorized. Only HR and SuperAdmin can verify candidates." },
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
    const { verified, notes } = body;

    // Validate verified is boolean
    if (typeof verified !== "boolean") {
      return NextResponse.json(
        { success: false, error: "verified must be a boolean" },
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

    // Check if onboarding is complete
    if (!candidate.onboardingDetails?.onboardingComplete) {
      return NextResponse.json(
        { success: false, error: "Candidate must complete onboarding before HR verification" },
        { status: 400 }
      );
    }

    // Update HR verification status with human-readable verifier name and role
    const verifierDisplay = verified ? `${userName || "HR Team"} (${userRole})` : null;
    const updateData: Record<string, unknown> = {
      "onboardingDetails.verifiedByHR.verified": verified,
      "onboardingDetails.verifiedByHR.verifiedBy": verifierDisplay,
      "onboardingDetails.verifiedByHR.verifiedAt": verified ? new Date() : null,
    };

    if (notes !== undefined) {
      updateData["onboardingDetails.verifiedByHR.notes"] = notes || null;
    }

    const updatedCandidate = await Candidate.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    if (!updatedCandidate) {
      return NextResponse.json(
        { success: false, error: "Failed to update HR verification status" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedCandidate,
      message: `Candidate ${verified ? "verified" : "unverified"} by HR successfully`,
    });
  } catch (error: any) {
    console.error("HR Verification error:", error);
    if (error.message === "Token Expired") {
      return NextResponse.json(
        { success: false, error: "Authentication expired" },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to update HR verification status" },
      { status: 500 }
    );
  }
}

