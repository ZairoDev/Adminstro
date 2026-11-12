import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import Candidate from "@/models/candidate";
import { createTransporterHR } from "@/lib/email/transporter";
import { getActiveHREmployee } from "@/lib/email/getHREmployee";
import { getOfferLetterEmailTemplate } from "@/lib/email/templates/offerLetter";
import { getDataFromToken } from "@/util/getDataFromToken";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getDataFromToken(request);
    const { id } = await params;
    await connectDb();

    let customEmailSubject: string | undefined;
    let customEmailHtml: string | undefined;
    try {
      const body = await request.json();
      if (body && typeof body === "object") {
        if (typeof body.customEmailSubject === "string" && body.customEmailSubject.trim()) {
          customEmailSubject = body.customEmailSubject.trim();
        }
        if (typeof body.customEmailHtml === "string" && body.customEmailHtml.trim()) {
          customEmailHtml = body.customEmailHtml.trim();
        }
      }
    } catch {}

    // Fetch candidate
    const candidate = await Candidate.findById(id);
    if (!candidate) {
      return NextResponse.json(
        { success: false, error: "Candidate not found" },
        { status: 404 }
      );
    }

    // Validate candidate status
    if (candidate.status !== "onboarding") {
      return NextResponse.json(
        { success: false, error: "Offer letter can only be sent to candidates with onboarding status" },
        { status: 400 }
      );
    }

    // Generate signing link for offer letter
    const offerLetterSigningLink = `${process.env.APP_URL || "http://localhost:3000"}/dashboard/candidatePortal/${id}/offer-letter`;

    // Validate email configuration
    const transporter = await createTransporterHR();
    const hrEmployee = await getActiveHREmployee();
    const template = getOfferLetterEmailTemplate(
      {
        candidateName: candidate.name,
        role: candidate.selectionDetails?.role || candidate.position,
        signingLink: offerLetterSigningLink,
        companyName: process.env.COMPANY_NAME || "Zairo International",
      },
      hrEmployee,
    );

    const subject =
      customEmailSubject && customEmailHtml
        ? customEmailSubject
        : template.subject;
    const html =
      customEmailSubject && customEmailHtml
        ? customEmailHtml
        : template.html;

    // Send email with signing link
    await transporter.sendMail({
      from: `"Zairo International HR" <${transporter.fromEmail}>`,
      to: candidate.email,
      subject,
      html,
    });

    // Update candidate record with signing link
    await Candidate.findByIdAndUpdate(id, {
      $set: {
        "selectionDetails.offerLetterSent": true,
        "selectionDetails.offerLetterSentAt": new Date(),
        "selectionDetails.offerLetterSigningLink": offerLetterSigningLink,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Offer letter sent successfully",
    });
  } catch (err: unknown) {
    const error = err as { status?: number; code?: string; message?: string };
    if (error?.status) {
      return NextResponse.json(
        { code: error.code || "AUTH_FAILED" },
        { status: error.status },
      );
    }
    console.error("Error sending offer letter:", err);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to send offer letter",
      },
      { status: 500 }
    );
  }
}
