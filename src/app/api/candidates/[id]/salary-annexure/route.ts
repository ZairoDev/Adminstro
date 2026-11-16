import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDb } from "@/util/db";
import Candidate from "@/models/candidate";
import { sendSignedSalaryAnnexureEmail } from "@/lib/email";

const bodySchema = z.object({
  signature: z.string().trim().min(1),
  signedPdfUrl: z.string().trim().url(),
});

function canSignSalaryAnnexure(candidate: {
  status?: string | null;
  employeeId?: unknown;
}): boolean {
  return (
    candidate.status === "selected" ||
    candidate.status === "onboarding" ||
    Boolean(candidate.employeeId)
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "A signature and the signed salary annexure are required" },
        { status: 400 },
      );
    }

    await connectDb();
    const existing = await Candidate.findById(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: "Candidate not found" }, { status: 404 });
    }
    if (!canSignSalaryAnnexure(existing)) {
      return NextResponse.json(
        { success: false, error: "This salary annexure is not available" },
        { status: 400 },
      );
    }
    if (existing.selectionDetails?.signedSalaryAnnexurePdfUrl) {
      return NextResponse.json(
        { success: false, error: "The salary annexure is already signed" },
        { status: 409 },
      );
    }

    const signedAt = new Date();
    const candidate = await Candidate.findByIdAndUpdate(
      id,
      {
        $set: {
          "selectionDetails.signedSalaryAnnexurePdfUrl": parsed.data.signedPdfUrl,
          "selectionDetails.salaryAnnexureSignedAt": signedAt,
          "selectionDetails.salaryAnnexureSignature": parsed.data.signature,
        },
      },
      { new: true },
    );
    if (!candidate) {
      return NextResponse.json({ success: false, error: "Candidate not found" }, { status: 404 });
    }

    let emailSent = false;
    const recipient = typeof candidate.email === "string" ? candidate.email.trim() : "";
    if (recipient) {
      const emailResult = await sendSignedSalaryAnnexureEmail({
        to: recipient,
        candidateName: candidate.name,
        signedPdfUrl: parsed.data.signedPdfUrl,
      });
      emailSent = emailResult.success;
      if (!emailSent) {
        console.error("Signed salary annexure email failed:", emailResult.error);
      }
    }

    return NextResponse.json({
      success: true,
      emailSent,
      data: candidate,
      message: "Salary annexure signed",
    });
  } catch (error) {
    console.error("Salary annexure signing error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save the signed salary annexure" },
      { status: 500 },
    );
  }
}
