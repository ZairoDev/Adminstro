import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import Candidate from "@/models/candidate";
import axios from "axios";
import { createTransporterHR } from "@/lib/email/transporter";
import { getActiveHREmployee } from "@/lib/email/getHREmployee";
import { getEmailSignature } from "@/lib/email/signature";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDb();

    const candidate = await Candidate.findById(id);
    if (!candidate) {
      return NextResponse.json(
        { success: false, error: "Candidate not found" },
        { status: 404 }
      );
    }

    if (candidate.status !== "onboarding") {
      return NextResponse.json(
        { success: false, error: "Candidate must be in onboarding status" },
        { status: 400 }
      );
    }

    // Generate offer letter PDF
    const offerLetterPayload = {
      letterDate: new Date().toISOString(),
      employeeName: candidate.name,
      employeeFullName: candidate.name,
      designation: candidate.position,
      dateOfJoining: (candidate.selectionDetails as Record<string, unknown>)?.dateOfJoining
        ? new Date((candidate.selectionDetails as Record<string, unknown>).dateOfJoining as string).toISOString()
        : new Date().toISOString(),
      postingLocation: candidate.city || "117/N/70 3rd Floor Kakadeo, Kanpur 208025",
      annualCTC: candidate.selectionDetails?.salary
        ? `₹${String(candidate.selectionDetails.salary)} per annum`
        : "As per employment terms",
      workingHoursStart: "11:30 AM",
      workingHoursEnd: "8:30 PM",
      salaryPaymentCycle: "15th to 18th",
      probationPeriod: "six (6) months",
    };

    // Generate PDF
    const pdfResponse = await axios.post(
      `${process.env.APP_URL || "http://localhost:3000"}/api/candidates/offerLetter`,
      offerLetterPayload,
      {
        responseType: "arraybuffer",
        headers: { "Content-Type": "application/json" },
      }
    );

    const pdfBuffer = Buffer.from(pdfResponse.data);

    // Get HR employee for email signature
    const hrEmployee = await getActiveHREmployee();
    const emailSignature = await getEmailSignature();

    // Send email with PDF attachment
    const transporter = createTransporterHR();
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; color: #222; line-height: 1.6;">
        <div style="background-color: #004aad; color: white; padding: 14px 24px; font-size: 20px; font-weight: bold; border-radius: 6px 6px 0 0;">
          Zairo International Private Limited
        </div>

        <div style="padding: 20px; border: 1px solid #eee; border-top: none; border-radius: 0 0 6px 6px;">
          <p>Dear ${candidate.name},</p>

          <p>We are pleased to extend to you an offer of employment with <strong>Zairo International Private Limited</strong>.</p>

          <p>Please find attached your <strong>Appointment Letter</strong> containing all the terms and conditions of your employment.</p>

          <p>We look forward to welcoming you to our team!</p>

          <p style="margin-top: 24px;">Best regards,<br/>
          <strong>HR Team</strong><br/>
          Zairo International Private Limited</p>

          ${emailSignature}
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"Zairo International HR" <hr@zairointernational.com>`,
      to: candidate.email,
      subject: `Appointment Letter - ${candidate.name}`,
      html: emailHtml,
      attachments: [
        {
          filename: `Offer-Letter-${candidate.name.replace(/\s+/g, "_")}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    // Update candidate to track that offer letter was sent
    await Candidate.findByIdAndUpdate(id, {
      $set: {
        "selectionDetails.offerLetterSent": true,
        "selectionDetails.offerLetterSentAt": new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Offer letter sent successfully",
    });
  } catch (error: any) {
    console.error("Error sending offer letter:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to send offer letter",
      },
      { status: 500 }
    );
  }
}
