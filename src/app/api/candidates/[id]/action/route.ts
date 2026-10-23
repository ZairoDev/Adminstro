
import { sendEmail } from "@/components/candidateEmail";
import { cancelCandidateInterviews } from "@/lib/interviews/publishInterview";
import type { CandidateEmailStatus, SelectionDetails } from "@/lib/email/types";
import Candidate from "@/models/candidate";
import { connectDb } from "@/util/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const selectionDetailsSchema = z
  .object({
    positionType: z.string(),
    duration: z.string().optional(),
    internDuration: z.string().optional(),
    trainingPeriod: z.string(),
    trainingDate: z.string().optional(),
    role: z.string(),
    salary: z.union([z.string(), z.number()]).optional(),
  })
  .passthrough();

const shortlistDetailsSchema = z
  .object({
    suitableRoles: z.array(z.string()).optional(),
    notes: z.string().nullable().optional(),
  })
  .passthrough();

const actionBodySchema = z.object({
  status: z.enum(["pending", "shortlisted", "selected", "rejected", "onboarding"]),
  selectionDetails: selectionDetailsSchema.optional(),
  shortlistDetails: shortlistDetailsSchema.optional(),
  rejectionDetails: z
    .object({
      reason: z.string().trim().min(1).max(500),
    })
    .optional(),
  isTrainingDiscontinuation: z.boolean().optional(),
  isOnboardingRejection: z.boolean().optional(),
});

function toEmailSelectionDetails(
  details: z.infer<typeof selectionDetailsSchema> | undefined
): SelectionDetails | undefined {
  if (!details) return undefined;
  return {
    positionType: details.positionType,
    duration: details.duration ?? "",
    internDuration: details.internDuration,
    trainingPeriod: details.trainingPeriod,
    trainingDate: details.trainingDate,
    role: details.role,
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await connectDb();

  try {
    const { id } = await params;
    const parsedBody = actionBodySchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json(
        { success: false, error: "Invalid request" },
        { status: 400 }
      );
    }

    const {
      status,
      selectionDetails,
      shortlistDetails,
      rejectionDetails,
      isTrainingDiscontinuation,
      isOnboardingRejection,
    } = parsedBody.data;

    const existing = await Candidate.findById(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Candidate not found" },
        { status: 404 }
      );
    }

    if (isOnboardingRejection && isTrainingDiscontinuation) {
      return NextResponse.json(
        { success: false, error: "Invalid rejection type" },
        { status: 400 }
      );
    }

    if (status === "rejected" && !rejectionDetails?.reason) {
      return NextResponse.json(
        { success: false, error: "Rejection reason is required" },
        { status: 400 }
      );
    }

    if (status === "rejected" && existing.employeeId) {
      return NextResponse.json(
        { success: false, error: "Employed people cannot be rejected" },
        { status: 400 }
      );
    }

    if (isOnboardingRejection) {
      if (status !== "rejected") {
        return NextResponse.json(
          { success: false, error: "Onboarding rejection must reject the candidate" },
          { status: 400 }
        );
      }
      if (existing.status !== "onboarding" || existing.exitedAt) {
        return NextResponse.json(
          {
            success: false,
            error: "Only candidates in onboarding who are not employed can be rejected from onboarding",
          },
          { status: 400 }
        );
      }
    } else if (status === "rejected" && existing.status === "onboarding") {
      return NextResponse.json(
        {
          success: false,
          error: "Candidates in onboarding must be rejected from onboarding",
        },
        { status: 400 }
      );
    }

    if (isTrainingDiscontinuation && existing.status !== "selected") {
      return NextResponse.json(
        { success: false, error: "Only candidates in training can be discontinued" },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = { status };

    if (status === "selected" && selectionDetails)
      updateData.selectionDetails = selectionDetails;
    if (status === "shortlisted" && shortlistDetails)
      updateData.shortlistDetails = shortlistDetails;
    if (status === "rejected" && rejectionDetails) {
      const category = isOnboardingRejection
        ? "onboarding"
        : isTrainingDiscontinuation
          ? "training"
          : "pipeline";
      updateData.rejectionDetails = {
        reason: rejectionDetails.reason,
        category,
      };
    }

    // If selected for training, set training agreement signing link and date
    let trainingAgreementLink: string | undefined;
    if (status === "selected") {
      trainingAgreementLink = `${process.env.APP_URL ?? "http://localhost:3000"}/dashboard/candidatePortal/${id}/training-agreement`;
      updateData["trainingAgreementDetails.signingLink"] = trainingAgreementLink;
      // Set the date when candidate was selected for training (only if not already set)
      updateData.selectedForTrainingAt = new Date();
    }

    // If onboarding step, set onboarding link in candidate onboardingDetails and date
    if (status === "onboarding") {
      // If frontend provided a link use it, otherwise generate one
      const link = `${process.env.APP_URL ?? "http://localhost:3000"}/dashboard/candidatePortal/${id}/onboarding`;
      updateData["onboardingDetails.onboardingLink"] = link;
      // Also mark status as onboarding
      updateData.status = "onboarding";
      // Set the date when onboarding started (only if not already set)
      updateData.onboardingStartedAt = new Date();
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
      const emailStatus: CandidateEmailStatus = isOnboardingRejection
        ? "onboardingRejected"
        : isTrainingDiscontinuation
          ? "trainingDiscontinued"
          : status;
      
      try {
        await sendEmail({
          to: candidate.email,
          candidateName: candidate.name,
          status: emailStatus,
          position: candidate.position,
          companyName: process.env.COMPANY_NAME || "Zairo International",
          selectionDetails:
            status === "selected" ? toEmailSelectionDetails(selectionDetails) : undefined,
          rejectionReason:
            status === "rejected" ? rejectionDetails?.reason : undefined,
          shortlistRoles:
            status === "shortlisted" ? shortlistDetails?.suitableRoles : undefined,
          onboardingLink: status === "onboarding" ? ( candidate.onboardingDetails?.onboardingLink || "") as string | undefined : undefined,
          trainingAgreementLink: trainingAgreementLink || (status === "selected" ? candidate.trainingAgreementDetails?.signingLink || "" : undefined) as string | undefined,
        });
        console.log(`✅ Email sent successfully to ${candidate.email} for status: ${emailStatus}`);
      } catch (emailError: unknown) {
        // Log email error but don't fail the entire operation
        console.error(`❌ Failed to send email to ${candidate.email}:`, emailError);
        // Continue with the status update even if email fails
      }
    }

    let responseCandidate = candidate;
    if (status === "rejected") {
      try {
        await cancelCandidateInterviews(candidate);
        const latest = await Candidate.findById(id);
        if (latest) responseCandidate = latest;
      } catch (calendarError: unknown) {
        console.error("Failed to cancel interview calendar events:", calendarError);
      }
    }

    return NextResponse.json({
      success: true,
      data: responseCandidate,
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
