import { EmailTemplate } from "../types";
import { getEmailSignature, EmailSignatureConfig } from "../signature";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface ReuploadEmailPayload {
  candidateName: string;
  documentLabels: string[];
  reuploadLink: string;
  reason?: string | null;
}

export function getReuploadEmailTemplate(
  payload: ReuploadEmailPayload,
  hrEmployee?: EmailSignatureConfig,
): EmailTemplate {
  const name = escapeHtml(payload.candidateName);
  const link = escapeHtml(payload.reuploadLink);
  const documentListHtml = payload.documentLabels
    .map((label) => `<li style="margin: 8px 0;">${escapeHtml(label)}</li>`)
    .join("");
  const reason = payload.reason?.trim()
    ? `
              <p style="margin: 15px 0 0 0; font-size: 14px; color: #92400e;">
                <strong>Reason:</strong> ${escapeHtml(payload.reason.trim())}
              </p>`
    : "";
  const emailSignature = getEmailSignature(hrEmployee);

  return {
    subject: "Document Re-upload Required - Zairo International",
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Document Re-upload Required</h1>
        </div>
        
        <div style="padding: 40px 30px; color: #333; line-height: 1.8;">
          <p style="font-size: 18px; color: #1f2937; margin-bottom: 20px;">Dear ${name},</p>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            During our review of your onboarding documents, we noticed that some documents require re-upload due to clarity or format issues.
          </p>
          
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 30px 0; border-radius: 4px;">
            <p style="margin: 0 0 15px 0; font-size: 16px; color: #92400e;">
              <strong>📋 Documents requiring re-upload:</strong>
            </p>
            <ul style="margin: 0; padding-left: 20px; color: #78350f;">
              ${documentListHtml}
            </ul>
            ${reason}
          </div>
          
          <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 25px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 15px; color: #1e40af;">
              <strong>💡 Tips for better document uploads:</strong><br/>
              • Take photos in portrait mode with good lighting<br/>
              • Ensure all text is clearly visible and not blurred<br/>
              • Avoid shadows or glare on the document<br/>
              • Make sure the entire document is visible in the frame
            </p>
          </div>
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="${link}" 
               style="display: inline-block; background: #f59e0b; color: #ffffff; padding: 16px 40px; 
                      border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;
                      box-shadow: 0 4px 6px rgba(245, 158, 11, 0.2); transition: all 0.3s;">
              Re-upload Documents Now
            </a>
          </div>
          
          <div style="background: #f9fafb; padding: 15px; border-radius: 6px; margin: 25px 0;">
            <p style="font-size: 13px; color: #6b7280; margin: 0;">
              <strong>Having trouble with the button?</strong> Copy and paste this link into your browser:
            </p>
            <p style="font-size: 13px; color: #f59e0b; word-break: break-all; margin: 8px 0 0 0;">
              ${link}
            </p>
            <p style="font-size: 12px; color: #9ca3af; margin: 10px 0 0 0;">
              ⏰ This link will expire in 7 days.
            </p>
          </div>
          
          <p style="font-size: 15px; margin-top: 25px;">
            If you have any questions or need assistance, please don't hesitate to reach out to our HR team.
          </p>
          
          ${emailSignature}
        </div>
        
        <div style="background: #f9fafb; padding: 20px 30px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 12px; color: #6b7280; margin: 0;">
            © ${new Date().getFullYear()} Zairo International. All rights reserved.
          </p>
        </div>
      </div>
    `,
  };
}
