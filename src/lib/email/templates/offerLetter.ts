import { EmailTemplate } from "../types";
import { getEmailSignature, EmailSignatureConfig } from "../signature";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface OfferLetterEmailPayload {
  candidateName: string;
  role: string;
  signingLink: string;
  companyName?: string;
}

export function getOfferLetterEmailTemplate(
  payload: OfferLetterEmailPayload,
  hrEmployee?: EmailSignatureConfig,
): EmailTemplate {
  const name = escapeHtml(payload.candidateName);
  const role = escapeHtml(payload.role);
  const link = escapeHtml(payload.signingLink);
  const company = escapeHtml(payload.companyName || "Zairo International");
  const emailSignature = getEmailSignature(hrEmployee);

  return {
    subject: `Offer Letter - ${payload.candidateName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Offer Letter</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">Offer Letter</h1>
        </div>
        
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
          <p>Dear ${name},</p>
          
          <p>We are pleased to offer you the position of <strong>${role}</strong> at ${company} Private Limited.</p>
          
          <p>
            <strong>Next step:</strong> Please review and sign your offer letter and the HR policies.
          </p>
    
          <div style="text-align: center; margin: 20px 0;">
            <a href="${link}" 
               style="display: inline-block; background: #2563eb; color: #ffffff; padding: 16px 40px; 
                      border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
              Sign Offer Letter
            </a>
          </div>
    
          <p style="font-size: 13px; color: #444; margin: 18px 0 6px 0;">
            If you are unable to access the button above, please copy and paste the following link into your browser:
          </p>
          <p style="font-size: 13px; color: #2563eb; word-break: break-all; margin: 0;">
            ${link}
          </p>
          
          <p>We look forward to welcoming you to our team!</p>
          
          <p style="margin-top: 30px;">Best regards,<br/>
          <strong>HR Team</strong><br/>
          ${company} Private Limited</p>
          
          ${emailSignature}
        </div>
      </body>
      </html>
    `,
  };
}
