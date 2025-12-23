
import { sendEmail } from "@/components/candidateEmail";
import Candidate from "@/models/candidate";
import { connectDb } from "@/util/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDb();

  try {
    const { id } = await params;
    const { status, selectionDetails, shortlistDetails, rejectionDetails} =
      await request.json();

    if (!["pending", "shortlisted", "selected", "rejected", "onboarding"].includes(status)) {
      return NextResponse.json(
        { success: false, error: "Invalid status" },
        { status: 400 }
      );
    }

    const updateData: any = { status };

    if (status === "selected" && selectionDetails)
      updateData.selectionDetails = selectionDetails;
    if (status === "shortlisted" && shortlistDetails)
      updateData.shortlistDetails = shortlistDetails;
    if (status === "rejected" && rejectionDetails)
      updateData.rejectionDetails = rejectionDetails;

    // If onboarding step, set onboarding link in candidate onboardingDetails
    if (status === "onboarding") {
      // If frontend provided a link use it, otherwise generate one
      const link = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard/candidatePortal/${id}/onboarding`;
      updateData["onboardingDetails.onboardingLink"] = link;
      // Also mark status as onboarding
      updateData.status = "onboarding";
    }

    const candidate = await Candidate.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    if (!candidate) {
      return NextResponse.json(
        { success: false, error: "Candidate not found" },
        { status: 404 }
      );
    }


    if (status !== "pending") {
      await sendEmail({
        to: candidate.email,
        candidateName: candidate.name,
        status,
        position: candidate.position,
        companyName: process.env.COMPANY_NAME || "Zairo International",
        selectionDetails: status === "selected" ? selectionDetails : undefined,
        rejectionReason:
          status === "rejected" ? rejectionDetails?.reason : undefined,
        shortlistRoles:
          status === "shortlisted"
            ? shortlistDetails?.suitableRoles
            : undefined,
        onboardingLink: status === "onboarding" ? ( candidate.onboardingDetails?.onboardingLink) : undefined,
      });
    }

    return NextResponse.json({
      success: true,
      data: candidate,
      message: `Candidate ${status}. Email notification sent.`,
    });
  } catch (error) {
    console.error("Action error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process action" },
      { status: 500 }
    );
  }
}
