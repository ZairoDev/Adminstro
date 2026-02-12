import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import Candidate from "@/models/candidate";
import axios from "axios";
import { createTransporterHR } from "@/lib/email/transporter";
import { getActiveHREmployee } from "@/lib/email/getHREmployee";
import { getEmailSignature } from "@/lib/email/signature";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDb();

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
    if (!process.env.HR_APP_PASSWORD) {
      return NextResponse.json(
        {
          success: false,
          error: "Email configuration error: HR_APP_PASSWORD environment variable is not set",
        },
        { status: 500 }
      );
    }

    // Get HR employee details for email
    const hrEmployee = await getActiveHREmployee();
    const emailSignature = await getEmailSignature(hrEmployee);
    const transporter = createTransporterHR();

    // Prepare email HTML with signing link
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Appointment Letter</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">Appointment Letter</h1>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
          <p>Dear ${candidate.name},</p>
          
          <p>We are pleased to offer you the position of <strong>${candidate.selectionDetails?.role || candidate.position}</strong> at Zairo International Private Limited.</p>
          
          <p>
            <strong>Next Step:</strong> Please review and sign your appointment letter to proceed with the onboarding process.
          </p>
    
          <div style="text-align: center; margin: 20px 0;">
            <a href="${offerLetterSigningLink}" 
               style="display: inline-block; background: #2563eb; color: #ffffff; padding: 16px 40px; 
                      border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
              Sign Appointment Letter
            </a>
          </div>
    
          <p style="font-size: 13px; color: #444; margin: 18px 0 6px 0;">
            If you are unable to access the button above, please copy and paste the following link into your browser:
          </p>
          <p style="font-size: 13px; color: #2563eb; word-break: break-all; margin: 0;">
            ${offerLetterSigningLink}
          </p>
          
          <p>We look forward to welcoming you to our team!</p>
          
          <p style="margin-top: 30px;">Best regards,<br/>
          <strong>HR Team</strong><br/>
          Zairo International Private Limited</p>
          
          ${emailSignature}
        </div>
      </body>
      </html>
    `;

    // Send email with signing link
    await transporter.sendMail({
      from: `"Zairo International HR" <hr@zairointernational.com>`,
      to: candidate.email,
      subject: `Appointment Letter - ${candidate.name}`,
      html: emailHtml,
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
