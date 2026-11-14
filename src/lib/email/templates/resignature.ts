import { EmailTemplate } from "../types";
import { getEmailSignature, EmailSignatureConfig } from "../signature";

function escapeHtml(value: string | null | undefined): string {
  return String(value ?? "")
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

/** Original request-resignature HTML style. */
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
            <a href="${link}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Re-sign ${agreementName}
            </a>
          </div>
          
          <p style="font-size: 12px; color: #666; margin-top: 30px;">
            <strong>Important:</strong> This link will expire in 7 days. If you have any questions, please contact HR.
          </p>
          
          <p style="font-size: 12px; color: #666;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${link}" style="color: #667eea; word-break: break-all;">${link}</a>
          </p>
        </div>
        
        ${emailSignature}
      </body>
      </html>
    `,
  };
}
