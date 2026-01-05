
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
    const { status, selectionDetails, shortlistDetails, rejectionDetails, isTrainingDiscontinuation} =
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

    // If selected for training, set training agreement signing link
    let trainingAgreementLink: string | undefined;
    if (status === "selected") {
      trainingAgreementLink = `${process.env.APP_URL ?? "http://localhost:3000"}/dashboard/candidatePortal/${id}/training-agreement`;
      updateData["trainingAgreementDetails.signingLink"] = trainingAgreementLink;
    }

    // If onboarding step, set onboarding link in candidate onboardingDetails
    if (status === "onboarding") {
      // If frontend provided a link use it, otherwise generate one
      const link = `${process.env.APP_URL ?? "http://localhost:3000"}/dashboard/candidatePortal/${id}/onboarding`;
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
      // Determine email status: use trainingDiscontinued if this is a training discontinuation, otherwise use the actual status
      const emailStatus = isTrainingDiscontinuation ? "trainingDiscontinued" : status;
      
      try {
        await sendEmail({
          to: candidate.email,
          candidateName: candidate.name,
          status: emailStatus as any,
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
          trainingAgreementLink: trainingAgreementLink || (status === "selected" ? candidate.trainingAgreementDetails?.signingLink : undefined),
        });
        console.log(`✅ Email sent successfully to ${candidate.email} for status: ${emailStatus}`);
      } catch (emailError: any) {
        // Log email error but don't fail the entire operation
        console.error(`❌ Failed to send email to ${candidate.email}:`, emailError);
        // Continue with the status update even if email fails
      }
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
