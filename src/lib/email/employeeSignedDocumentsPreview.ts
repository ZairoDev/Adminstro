import { EmailTemplate, SelectionDetails } from "./types";
import { getEmailSignature, EmailSignatureConfig } from "./signature";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function getEmployeeSignedDocumentsPreviewTemplate(
  payload: {
    employeeName: string;
    position: string;
    selectionDetails?: SelectionDetails | null;
    attachedNames: string[];
    companyName?: string;
  },
  hrEmployee?: EmailSignatureConfig,
): EmailTemplate {
  const companyName = payload.companyName || "Zairo International";
  const name = escapeHtml(payload.employeeName);
  const role = escapeHtml(payload.position);
  const company = escapeHtml(companyName);
  const attachmentList = (payload.attachedNames || [])
    .map((item) => `<li style="margin: 6px 0;">${escapeHtml(item)}</li>`)
    .join("");
  const selectionDetails = payload.selectionDetails;

  const details = selectionDetails
    ? `
                <p style="font-size: 15px; margin: 24px 0 8px 0;"><strong>Selection details</strong></p>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
                  ${selectionDetails.positionType ? `
                  <tr>
                    <td style="padding: 8px 0; font-weight: 600;">Position type:</td>
                    <td style="padding: 8px 0;">${escapeHtml(selectionDetails.positionType)}</td>
                  </tr>` : ""}
                  ${selectionDetails.role ? `
                  <tr>
                    <td style="padding: 8px 0; font-weight: 600;">Role:</td>
                    <td style="padding: 8px 0;">${escapeHtml(selectionDetails.role)}</td>
                  </tr>` : ""}
                  ${selectionDetails.trainingPeriod ? `
                  <tr>
                    <td style="padding: 8px 0; font-weight: 600;">Training period:</td>
                    <td style="padding: 8px 0;">${escapeHtml(selectionDetails.trainingPeriod)}</td>
                  </tr>` : ""}
                  ${selectionDetails.duration ? `
                  <tr>
                    <td style="padding: 8px 0; font-weight: 600;">Training duration:</td>
                    <td style="padding: 8px 0;">${escapeHtml(selectionDetails.duration)}</td>
                  </tr>` : ""}
                  ${selectionDetails.internDuration ? `
                  <tr>
                    <td style="padding: 8px 0; font-weight: 600;">Internship duration:</td>
                    <td style="padding: 8px 0;">${escapeHtml(selectionDetails.internDuration)}</td>
                  </tr>` : ""}
                  ${selectionDetails.trainingDate ? `
                  <tr>
                    <td style="padding: 8px 0; font-weight: 600;">Training start date:</td>
                    <td style="padding: 8px 0;">${escapeHtml(selectionDetails.trainingDate)}</td>
                  </tr>` : ""}
                </table>
              `
    : "";

  return {
    subject: `Your signed employment documents – ${companyName}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 36px 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Signed Documents</h1>
        </div>
        <div style="padding: 36px 30px; color: #333; line-height: 1.7;">
          <p style="font-size: 16px; margin-bottom: 16px;">Dear ${name},</p>
          <p style="font-size: 15px; margin-bottom: 16px;">
            Welcome to <strong>${company}</strong>. Please find attached copies of the documents you signed during selection and onboarding${role ? ` for the role of <strong>${role}</strong>` : ""}.
          </p>
          ${details}
          ${
            attachmentList
              ? `
          <p style="font-size: 15px; margin-bottom: 8px;"><strong>Attached documents</strong></p>
          <ul style="margin: 0 0 16px 0; padding-left: 20px;">
            ${attachmentList}
          </ul>`
              : ""
          }
          <p style="font-size: 15px; margin-bottom: 16px;">
            Please keep these files for your records. If any attachment is missing or incorrect, contact HR.
          </p>
          ${getEmailSignature(hrEmployee)}
        </div>
      </div>
    `,
  };
}
