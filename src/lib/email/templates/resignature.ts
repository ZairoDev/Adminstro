import { EmailTemplate } from "../types";
import { getEmailSignature, EmailSignatureConfig } from "../signature";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface ResignatureEmailPayload {
  candidateName: string;
  agreementType: "training" | "onboarding";
  resignatureLink: string;
  reason?: string | null;
}

export function getResignatureEmailTemplate(
  payload: ResignatureEmailPayload,
  hrEmployee?: EmailSignatureConfig,
): EmailTemplate {
  const agreementName =
    payload.agreementType === "training"
      ? "Training Agreement"
      : "Onboarding Agreement";
  const name = escapeHtml(payload.candidateName);
  const link = escapeHtml(payload.resignatureLink);
  const reason = payload.reason?.trim()
    ? `<p><strong>Reason:</strong> ${escapeHtml(payload.reason.trim())}</p>`
    : "";
  const emailSignature = getEmailSignature(hrEmployee);

  return {
    subject: `Action Required: Re-sign ${agreementName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Re-sign ${agreementName}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">Action Required: Re-sign ${agreementName}</h1>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
          <p>Dear ${name},</p>
          
          <p>We need you to re-sign your ${agreementName}. Please click the button below to access the re-signature page:</p>
          
          ${reason}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${link}"
               style="display: inline-block; background: #2563eb; color: #ffffff; padding: 16px 40px;
                      border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
              Re-sign ${agreementName}
            </a>
          </div>

          <p style="font-size: 13px; color: #444; margin: 18px 0 6px 0;">
            If you are unable to access the button above, copy and paste this link into your browser:
          </p>
          <p style="font-size: 13px; color: #2563eb; word-break: break-all; margin: 0;">
            ${link}
          </p>
          
          ${emailSignature}
        </div>
      </body>
      </html>
    `,
  };
}
