// /lib/candidateEmail.ts
import nodemailer from "nodemailer";

export interface EmailPayload {
  to: string;
  candidateName: string;
  status: "selected" | "rejected" | "shortlisted" | "onboarding";
  position: string;
  companyName?: string;
  selectionDetails?: {
    positionType: string;
    duration: string;
    trainingPeriod: string;
    role: string;
  };
  rejectionReason?: string;
  shortlistRoles?: string[];
  onboardingLink?: string;
  id?: string;
}

// Reuse your getEmailTemplate from before
export const getEmailTemplate = (
  payload: EmailPayload
): { subject: string; html: string } => {
  const {
    candidateName,
    status,
    position,
    companyName = "Zairo International",
    selectionDetails,
    rejectionReason,
    shortlistRoles,
    onboardingLink,
  } = payload;

  const templates = {
    onboarding: {
      subject: `Welcome aboard! Complete your onboarding for ${position}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2>Welcome, ${candidateName}!</h2>
          <p>We're excited to have you join <strong>${companyName}</strong> as a <strong>${position}</strong>.</p>
          <p>Please complete your onboarding by visiting the link below:</p>
          <div style="margin:16px 0;">
            <a href="${payload.onboardingLink ?? '#'}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;">Complete Onboarding</a>
          </div>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break:break-all;color:#0b1226">${payload.onboardingLink ?? 'No link provided'}</p>
          <br/>
          <p>Best,<br/>${companyName} Team</p>
        </div>
      `,
    },
    selected: {
      subject: `Congratulations! You've been selected for ${position}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2>Congratulations, ${candidateName}!</h2>
          <p>You have been <strong>selected</strong> for the position of <strong>${position}</strong> at ${companyName}.</p>
          ${
            selectionDetails
              ? `
              <div style="background:#f5f5f5;padding:15px;border-radius:5px;">
                <h3>Position Details:</h3>
                <p><strong>Type:</strong> ${selectionDetails.positionType}</p>
                <p><strong>Duration:</strong> ${selectionDetails.duration}</p>
                <p><strong>Training:</strong> ${selectionDetails.trainingPeriod}</p>
                <p><strong>Role:</strong> ${selectionDetails.role}</p>
              </div>`
              : ""
          }
          <p>We'll contact you soon with next steps!</p>
          <br/>
          <p>Best,<br/>${companyName} Team</p>
        </div>
      `,
    },
    rejected: {
      subject: `${position} Application Update`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2>Thank you, ${candidateName}</h2>
          <p>We appreciate your interest in the <strong>${position}</strong> position at ${companyName}.</p>
          ${
            rejectionReason
              ? `<p><strong>Reason:</strong> ${rejectionReason}</p>`
              : ""
          }
          <p>We encourage you to apply again in the future!</p>
          <br/>
          <p>Best,<br/>${companyName} Team</p>
        </div>
      `,
    },
    shortlisted: {
      subject: `You've been shortlisted for ${position}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2>Great news, ${candidateName}!</h2>
          <p>You have been <strong>shortlisted</strong> for the position of <strong>${position}</strong> at ${companyName}.</p>
          ${
            shortlistRoles && shortlistRoles.length > 0
              ? `
              <div style="background:#f0f9ff;padding:15px;border-radius:5px;">
                <h3>Suggested Roles:</h3>
                <ul>${shortlistRoles.map((r) => `<li>${r}</li>`).join("")}</ul>
              </div>`
              : ""
          }
          <p>We'll reach out with more details soon!</p>
          <br/>
          <p>Best,<br/>${companyName} Team</p>
        </div>
      `,
    },
  };


  return templates[status];
};

// ✉️ Updated sendEmail (uses Nodemailer directly)
export async function sendEmail(payload: EmailPayload) {
  try {
    const { subject, html } = getEmailTemplate(payload);

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "zairo.domain@gmail.com",
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    const mailOptions = {
      from: "No Reply <zairo.domain@gmail.com>",
      to: payload.to,
      subject,
      html,
    };

    const mailResponse = await transporter.sendMail(mailOptions);

    if (mailResponse.rejected.length > 0) {
      throw new Error("Email address was rejected or invalid");
    }

    console.log("Email sent successfully to:", payload.to);
    return { success: true };
  } catch (error: any) {
    console.error("Email sending error:", error);
    return { success: false, error: error.message };
  }
}
