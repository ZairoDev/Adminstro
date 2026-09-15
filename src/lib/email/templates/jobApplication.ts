import { EmailTemplate } from "../types";
import { getEmailSignature, EmailSignatureConfig } from "../signature";

export const JOB_APPLICATION_HR_INBOX = "hr@zairointl.com";

export interface JobApplicationEmailDetails {
  applicantName: string;
  applicantEmail: string;
  phone: string;
  position: string;
  officeCity: string;
  city: string;
  country: string;
  college: string;
  experience: string;
  linkedin?: string;
  applicationId: string;
  reviewUrl?: string;
  companyName?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function displayOrDash(value: string | undefined): string {
  const trimmed = (value || "").trim();
  return trimmed ? escapeHtml(trimmed) : "—";
}

export function getApplicantApplicationReceivedTemplate(
  details: JobApplicationEmailDetails,
  hrEmployee?: EmailSignatureConfig,
): EmailTemplate {
  const companyName = details.companyName || "Zairo International";
  const name = displayOrDash(details.applicantName);
  const position = displayOrDash(details.position);
  const officeCity = displayOrDash(details.officeCity);

  return {
    subject: `Application received — ${details.position} | ${companyName}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 36px 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Application Received</h1>
        </div>
        <div style="padding: 36px 30px; color: #333; line-height: 1.7;">
          <p style="font-size: 16px; margin-bottom: 16px;">Dear ${name},</p>
          <p style="font-size: 15px; margin-bottom: 16px;">
            Thank you for applying for the <strong>${position}</strong> position at <strong>${escapeHtml(companyName)}</strong>.
            We confirm that your application has been received successfully.
          </p>
          <p style="font-size: 15px; margin-bottom: 16px;">
            Our Human Resources team will review your profile. If your experience and qualifications
            align with the role, we will contact you regarding the next steps. Please allow
            <strong>3–5 business days</strong> for this initial review.
          </p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; margin: 24px 0;">
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #64748b;">Application summary</p>
            <p style="margin: 0; font-size: 15px;"><strong>Role:</strong> ${position}</p>
            <p style="margin: 8px 0 0 0; font-size: 15px;"><strong>Preferred office:</strong> ${officeCity}</p>
          </div>
          <p style="font-size: 15px; margin-bottom: 16px;">
            If you have any questions in the meantime, please write to
            <a href="mailto:${JOB_APPLICATION_HR_INBOX}" style="color: #2563eb; text-decoration: none;">${JOB_APPLICATION_HR_INBOX}</a>.
          </p>
          <p style="font-size: 15px; margin-top: 24px;">
            Kind regards,<br/>
            Human Resources<br/>
            ${escapeHtml(companyName)}
          </p>
          ${getEmailSignature(hrEmployee)}
        </div>
        <div style="background: #f9fafb; padding: 18px 30px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 12px; color: #6b7280; margin: 0;">
            This is an automated acknowledgement of your application.
          </p>
          <p style="font-size: 12px; color: #6b7280; margin: 8px 0 0 0;">
            © ${new Date().getFullYear()} ${escapeHtml(companyName)}. All rights reserved.
          </p>
        </div>
      </div>
    `,
  };
}

function hrDetailRow(label: string, value: string): string {
  return `
    <tr>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; color: #64748b; font-size: 13px; width: 38%; vertical-align: top;">${label}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px;">${value}</td>
    </tr>
  `;
}

export function getHrNewApplicationTemplate(
  details: JobApplicationEmailDetails,
): EmailTemplate {
  const companyName = details.companyName || "Zairo International";
  const name = displayOrDash(details.applicantName);
  const position = displayOrDash(details.position);
  const reviewLink = details.reviewUrl
    ? `<p style="text-align: center; margin: 28px 0 8px 0;">
         <a href="${escapeHtml(details.reviewUrl)}"
            style="display: inline-block; background: #2563eb; color: #ffffff; padding: 12px 28px;
                   border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
           Open candidate profile
         </a>
       </p>`
    : "";

  return {
    subject: `New job application — ${details.applicantName} for ${details.position}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 640px; margin: 0 auto; background: #ffffff;">
        <div style="background: #0f172a; padding: 28px 30px; border-radius: 8px 8px 0 0;">
          <p style="margin: 0; color: #94a3b8; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase;">HR notification</p>
          <h1 style="color: #ffffff; margin: 8px 0 0 0; font-size: 22px; font-weight: 600;">New job application received</h1>
        </div>
        <div style="padding: 32px 30px; color: #333; line-height: 1.6;">
          <p style="font-size: 15px; margin-bottom: 18px;">
            A candidate has submitted a job application through the public application form for
            <strong>${escapeHtml(companyName)}</strong>.
          </p>
          <table style="width: 100%; border-collapse: collapse; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            ${hrDetailRow("Candidate", name)}
            ${hrDetailRow("Email", displayOrDash(details.applicantEmail))}
            ${hrDetailRow("Phone", displayOrDash(details.phone))}
            ${hrDetailRow("Position applied", position)}
            ${hrDetailRow("Preferred office", displayOrDash(details.officeCity))}
            ${hrDetailRow("City / Country", `${displayOrDash(details.city)} / ${displayOrDash(details.country)}`)}
            ${hrDetailRow("College / University", displayOrDash(details.college))}
            ${hrDetailRow("Experience", displayOrDash(details.experience))}
            ${hrDetailRow("LinkedIn", displayOrDash(details.linkedin))}
            ${hrDetailRow("Application ID", displayOrDash(details.applicationId))}
          </table>
          ${reviewLink}
          <p style="font-size: 14px; color: #64748b; margin-top: 24px;">
            Please review the application and proceed with shortlisting or interview scheduling as appropriate.
          </p>
        </div>
        <div style="background: #f9fafb; padding: 16px 30px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 12px; color: #6b7280; margin: 0;">
            Automated notification from ${escapeHtml(companyName)} recruiting.
          </p>
        </div>
      </div>
    `,
  };
}
