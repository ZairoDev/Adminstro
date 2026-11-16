import { EmailTemplate } from "../types";
import { getEmailSignature, EmailSignatureConfig } from "../signature";

function escapeHtml(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface SalaryAnnexureEmailPayload {
  candidateName: string;
  role: string;
  signingLink: string;
  companyName?: string;
}

export function getSalaryAnnexureEmailTemplate(
  payload: SalaryAnnexureEmailPayload,
  hrEmployee?: EmailSignatureConfig,
): EmailTemplate {
  const name = escapeHtml(payload.candidateName);
  const role = escapeHtml(payload.role);
  const link = escapeHtml(payload.signingLink);
  const company = escapeHtml(payload.companyName || "Zairo International");
  const emailSignature = getEmailSignature(hrEmployee);

  return {
    subject: `Salary Annexure - ${payload.candidateName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Salary Annexure</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #111; max-width: 600px; margin: 0 auto; padding: 20px;">
        <p>Dear ${name},</p>
        <p>
          Please review and sign your salary annexure for the position of <strong>${role}</strong> at ${company}.
        </p>
        <p>This page contains only the salary annexure. Download it, sign it, and the signed copy will be emailed to you.</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${link}"
             style="display: inline-block; background: #1e293b; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
            Review and sign salary annexure
          </a>
        </div>
        <p style="font-size: 13px; color: #444; margin: 18px 0 6px 0;">
          If the button does not open, copy and paste this link into your browser:
        </p>
        <p style="font-size: 13px; color: #1e293b; word-break: break-all; margin: 0;">${link}</p>
        <p style="margin-top: 28px;">Best regards,<br/><strong>HR Team</strong><br/>${company}</p>
        ${emailSignature}
      </body>
      </html>
    `,
  };
}
