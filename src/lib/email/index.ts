// Main Email Module - Exports all email functionality
import {
  createTransporter,
  createTransporterHR,
  DEFAULT_FROM_EMAIL,
  DEFAULT_COMPANY_NAME,
} from "./transporter";
import { getCandidateEmailTemplate } from "./templates/candidate";
import { getWarningEmailTemplate, getWarningReasonText } from "./templates/warning";
import { getPIPEmailTemplate, getPIPLevelDescription, getPIPCompletionEmailTemplate } from "./templates/pip";
import { getAppreciationEmailTemplate, getAppreciationReasonText } from "./templates/appreciation";
import { getSeparationEmailTemplate, getSeparationReasonText, SeparationEmailPayload, SeparationType } from "./templates/separation";
import { getPersonalReminderEmailTemplate } from "./templates/personalReminder";
import {
  JOB_APPLICATION_HR_INBOX,
  JobApplicationEmailDetails,
  getApplicantApplicationReceivedTemplate,
  getHrNewApplicationTemplate,
} from "./templates/jobApplication";
import {
  CandidateEmailPayload,
  WarningEmailPayload,
  PIPEmailPayload,
  AppreciationEmailPayload,
  EmailResponse,
  EmailTemplate,
  PIPLevel,
  SelectionDetails,
} from "./types";
import { getActiveHREmployee } from "./getHREmployee";
import { getEmailSignature } from "./signature";
import type { EmailSignatureConfig } from "./signature";

// Re-export all types
export * from "./types";

// Re-export template functions
export { getCandidateEmailTemplate } from "./templates/candidate";
export { getWarningEmailTemplate, getWarningReasonText } from "./templates/warning";
export { getPIPEmailTemplate, getPIPLevelDescription, getPIPCompletionEmailTemplate } from "./templates/pip";
export { getAppreciationEmailTemplate, getAppreciationReasonText } from "./templates/appreciation";
export { getSeparationEmailTemplate, getSeparationReasonText, SEPARATION_TYPE_LABELS } from "./templates/separation";
export type { SeparationEmailPayload, SeparationType, SeparationEmailTemplate } from "./templates/separation";
export { getEmailSignature, getEmailSignatureWithImage } from "./signature";
export type { EmailSignatureConfig } from "./signature";
export { getActiveHREmployee } from "./getHREmployee";
export type { HREmployee } from "./getHREmployee";
export {
  JOB_APPLICATION_HR_INBOX,
  getApplicantApplicationReceivedTemplate,
  getHrNewApplicationTemplate,
} from "./templates/jobApplication";
export type { JobApplicationEmailDetails } from "./templates/jobApplication";

// Legacy export for backward compatibility with existing code
export type EmailPayload = CandidateEmailPayload;
export const getEmailTemplate = getCandidateEmailTemplate;

// Send Candidate Email
export async function sendCandidateEmail(
  payload: CandidateEmailPayload
): Promise<EmailResponse> {
  try {
    // Fetch active HR employee for signature
    const hrEmployee = await getActiveHREmployee();
    const { subject, html } = getCandidateEmailTemplate(payload, hrEmployee);
    const transporter = createTransporterHR();

    const mailOptions = {
      from: `${payload.companyName || DEFAULT_COMPANY_NAME} <${DEFAULT_FROM_EMAIL}>`,
      to: payload.to,
      subject,
      html,
    };

    const mailResponse = await transporter.sendMail(mailOptions);

    if (mailResponse.rejected.length > 0) {
      throw new Error("Email address was rejected or invalid");
    }

    // Candidate email sent successfully
    return { success: true, messageId: mailResponse.messageId };
  } catch (error: any) {
    console.error("❌ Candidate email sending error:", error);
    return { success: false, error: error.message };
  }
}

// Send Warning Email
export async function sendWarningEmail(
  payload: WarningEmailPayload
): Promise<EmailResponse> {
  try {
    // Fetch active HR employee for signature
    const hrEmployee = await getActiveHREmployee();
    const { subject, html } = getWarningEmailTemplate(payload, hrEmployee);
    const transporter = createTransporterHR();

    const mailOptions = {
      from: `${payload.companyName || DEFAULT_COMPANY_NAME} <${DEFAULT_FROM_EMAIL}>`,
      to: payload.to,
      subject,
      html,
    };

    const mailResponse = await transporter.sendMail(mailOptions);

    if (mailResponse.rejected.length > 0) {
      throw new Error("Email address was rejected or invalid");
    }

    // Warning email sent successfully
    return { success: true, messageId: mailResponse.messageId };
  } catch (error: any) {
    console.error("❌ Warning email sending error:", error);
    return { success: false, error: error.message };
  }
}

// Send PIP Email
export async function sendPIPEmail(
  payload: PIPEmailPayload
): Promise<EmailResponse> {
  try {
    // Fetch active HR employee for signature
    const hrEmployee = await getActiveHREmployee();
    const { subject, html } = getPIPEmailTemplate(payload, hrEmployee);
    const transporter = createTransporterHR();

    const mailOptions = {
      from: `${payload.companyName || DEFAULT_COMPANY_NAME} <${DEFAULT_FROM_EMAIL}>`,
      to: payload.to,
      subject,
      html,
    };

    const mailResponse = await transporter.sendMail(mailOptions);

    if (mailResponse.rejected.length > 0) {
      throw new Error("Email address was rejected or invalid");
    }

    // PIP email sent successfully
    return { success: true, messageId: mailResponse.messageId };
  } catch (error: any) {
    console.error("❌ PIP email sending error:", error);
    return { success: false, error: error.message };
  }
}

// Send PIP Completion Email (when PIP is successfully completed)
export async function sendPIPCompletionEmail(
  to: string,
  employeeName: string,
  pipLevel: PIPLevel,
  startDate: string,
  endDate: string,
  companyName?: string
): Promise<EmailResponse> {
  try {
    // Fetch active HR employee for signature
    const hrEmployee = await getActiveHREmployee();
    const { subject, html } = getPIPCompletionEmailTemplate(
      employeeName,
      pipLevel,
      startDate,
      endDate,
      companyName || DEFAULT_COMPANY_NAME,
      hrEmployee
    );
    const transporter = createTransporterHR();

    const mailOptions = {
      from: `${companyName || DEFAULT_COMPANY_NAME} <${DEFAULT_FROM_EMAIL}>`,
      to,
      subject,
      html,
    };

    const mailResponse = await transporter.sendMail(mailOptions);

    if (mailResponse.rejected.length > 0) {
      throw new Error("Email address was rejected or invalid");
    }

    // PIP completion email sent successfully
    return { success: true, messageId: mailResponse.messageId };
  } catch (error: any) {
    console.error("❌ PIP completion email sending error:", error);
    return { success: false, error: error.message };
  }
}

// Send Appreciation Email
export async function sendAppreciationEmail(
  payload: AppreciationEmailPayload
): Promise<EmailResponse> {
  try {
    // Fetch active HR employee for signature
    const hrEmployee = await getActiveHREmployee();
    const { subject, html } = getAppreciationEmailTemplate(payload, hrEmployee);
    const transporter = createTransporterHR();

    const mailOptions = {
      from: `${payload.companyName || DEFAULT_COMPANY_NAME} <${DEFAULT_FROM_EMAIL}>`,
      to: payload.to,
      subject,
      html,
    };

    const mailResponse = await transporter.sendMail(mailOptions);

    if (mailResponse.rejected.length > 0) {
      throw new Error("Email address was rejected or invalid");
    }

    // Appreciation email sent successfully
    return { success: true, messageId: mailResponse.messageId };
  } catch (error: any) {
    console.error("❌ Appreciation email sending error:", error);
    return { success: false, error: error.message };
  }
}

// Send Separation (Termination/Suspension) Email
export async function sendSeparationEmail(
  payload: SeparationEmailPayload
): Promise<EmailResponse> {
  try {
    // Fetch active HR employee for signature
    const hrEmployee = await getActiveHREmployee();
    const { subject, html } = getSeparationEmailTemplate(payload, hrEmployee);
    const transporter = createTransporterHR();

    const mailOptions = {
      from: `${payload.companyName || DEFAULT_COMPANY_NAME} <${DEFAULT_FROM_EMAIL}>`,
      to: payload.to,
      subject,
      html,
    };

    const mailResponse = await transporter.sendMail(mailOptions);

    if (mailResponse.rejected.length > 0) {
      throw new Error("Email address was rejected or invalid");
    }

    // Separation email sent successfully
    return { success: true, messageId: mailResponse.messageId };
  } catch (error: any) {
    console.error(`❌ ${payload.separationType} email sending error:`, error);
    return { success: false, error: error.message };
  }
}

// Generic send email function (backward compatible)
export async function sendEmail(payload: CandidateEmailPayload): Promise<EmailResponse> {
  return sendCandidateEmail(payload);
}

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

// Send custom email with provided template
export async function sendCustomEmail(
  to: string,
  template: EmailTemplate,
  companyName?: string,
  attachments?: EmailAttachment[],
  cc?: string[],
): Promise<EmailResponse> {
  try {
    const transporter = createTransporterHR();

    const mailOptions = {
      from: `${companyName || DEFAULT_COMPANY_NAME} <${DEFAULT_FROM_EMAIL}>`,
      to,
      subject: template.subject,
      html: template.html,
      ...(attachments && attachments.length > 0 ? { attachments } : {}),
      ...(cc && cc.length > 0 ? { cc } : {}),
    };

    const mailResponse = await transporter.sendMail(mailOptions);

    if (mailResponse.rejected.length > 0) {
      throw new Error("Email address was rejected or invalid");
    }

    // Custom email sent successfully
    return { success: true, messageId: mailResponse.messageId };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("❌ Custom email sending error:", message);
    return { success: false, error: message };
  }
}

export interface SignedDocumentSource {
  filename: string;
  url: string | null | undefined;
}

export interface EmployeeSignedDocumentsEmailPayload {
  to: string;
  employeeName: string;
  position?: string;
  selectionDetails?: SelectionDetails | null;
  documents: SignedDocumentSource[];
  companyName?: string;
}

async function fetchUrlAsBuffer(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return Buffer.from(await response.arrayBuffer());
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Failed to fetch email attachment:", url, message);
    return null;
  }
}

function getEmployeeSignedDocumentsTemplate(
  employeeName: string,
  position: string,
  selectionDetails: SelectionDetails | null | undefined,
  attachedNames: string[],
  companyName: string,
  hrEmployee?: EmailSignatureConfig,
): EmailTemplate {
  const name = escapeLoginEmailHtml(employeeName);
  const role = escapeLoginEmailHtml(position);
  const company = escapeLoginEmailHtml(companyName);
  const attachmentList = attachedNames
    .map((item) => `<li style="margin: 6px 0;">${escapeLoginEmailHtml(item)}</li>`)
    .join("");

  const details = selectionDetails
    ? `
                <p style="font-size: 15px; margin: 24px 0 8px 0;"><strong>Selection details</strong></p>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
                  ${selectionDetails.positionType ? `
                  <tr>
                    <td style="padding: 8px 0; font-weight: 600;">Position type:</td>
                    <td style="padding: 8px 0;">${escapeLoginEmailHtml(selectionDetails.positionType)}</td>
                  </tr>` : ""}
                  ${selectionDetails.role ? `
                  <tr>
                    <td style="padding: 8px 0; font-weight: 600;">Role:</td>
                    <td style="padding: 8px 0;">${escapeLoginEmailHtml(selectionDetails.role)}</td>
                  </tr>` : ""}
                  ${selectionDetails.trainingPeriod ? `
                  <tr>
                    <td style="padding: 8px 0; font-weight: 600;">Training period:</td>
                    <td style="padding: 8px 0;">${escapeLoginEmailHtml(selectionDetails.trainingPeriod)}</td>
                  </tr>` : ""}
                  ${selectionDetails.duration ? `
                  <tr>
                    <td style="padding: 8px 0; font-weight: 600;">Training duration:</td>
                    <td style="padding: 8px 0;">${escapeLoginEmailHtml(selectionDetails.duration)}</td>
                  </tr>` : ""}
                  ${selectionDetails.internDuration ? `
                  <tr>
                    <td style="padding: 8px 0; font-weight: 600;">Internship duration:</td>
                    <td style="padding: 8px 0;">${escapeLoginEmailHtml(selectionDetails.internDuration)}</td>
                  </tr>` : ""}
                  ${selectionDetails.trainingDate ? `
                  <tr>
                    <td style="padding: 8px 0; font-weight: 600;">Training start date:</td>
                    <td style="padding: 8px 0;">${escapeLoginEmailHtml(selectionDetails.trainingDate)}</td>
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

export async function sendEmployeeSignedDocumentsEmail(
  payload: EmployeeSignedDocumentsEmailPayload,
): Promise<EmailResponse> {
  const companyName = payload.companyName || DEFAULT_COMPANY_NAME;
  const attachments: EmailAttachment[] = [];

  for (const document of payload.documents) {
    const url = document.url?.trim();
    if (!url) continue;
    const content = await fetchUrlAsBuffer(url);
    if (!content) continue;
    attachments.push({
      filename: document.filename,
      content,
      contentType: "application/pdf",
    });
  }

  if (attachments.length === 0) {
    return { success: false, error: "No signed documents available to attach" };
  }

  const hrEmployee = await getActiveHREmployee();
  const template = getEmployeeSignedDocumentsTemplate(
    payload.employeeName,
    payload.position || payload.selectionDetails?.role || "",
    payload.selectionDetails,
    attachments.map((item) => item.filename),
    companyName,
    hrEmployee,
  );

  return sendCustomEmail(payload.to, template, companyName, attachments);
}

export interface PersonalReminderEmailPayload {
  to: string;
  employeeName: string;
  title: string;
  note: string;
  scheduledAt: Date;
  appUrl: string;
}

export async function sendJobApplicationReceivedEmails(
  details: JobApplicationEmailDetails,
): Promise<{ applicant: EmailResponse; hr: EmailResponse }> {
  const hrEmployee = await getActiveHREmployee();
  const companyName = details.companyName || DEFAULT_COMPANY_NAME;
  const transporter = createTransporterHR();
  const applicantTemplate = getApplicantApplicationReceivedTemplate(
    details,
    hrEmployee,
  );
  const hrTemplate = getHrNewApplicationTemplate(details);

  const sendOne = async (
    to: string,
    template: EmailTemplate,
  ): Promise<EmailResponse> => {
    try {
      const mailResponse = await transporter.sendMail({
        from: `${companyName} <${DEFAULT_FROM_EMAIL}>`,
        to,
        replyTo: JOB_APPLICATION_HR_INBOX,
        subject: template.subject,
        html: template.html,
      });
      if (mailResponse.rejected.length > 0) {
        throw new Error("Email address was rejected or invalid");
      }
      return { success: true, messageId: mailResponse.messageId };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("Job application email error:", message);
      return { success: false, error: message };
    }
  };

  const [applicant, hr] = await Promise.all([
    sendOne(details.applicantEmail, applicantTemplate),
    sendOne(JOB_APPLICATION_HR_INBOX, hrTemplate),
  ]);

  return { applicant, hr };
}

export interface LoginNotificationEmailPayload {
  to: string;
  employeeName: string;
  employeeEmail: string;
  role?: string;
  loginTime?: Date;
  employeeId: string;
}

const LOGIN_NOTIFICATION_CC = [
  "zairo.international@gmail.com",
  "ankita@vacationsaga.com",
] as const;

function formatLoginTimeIst(loginTime: Date): string {
  const formatted = loginTime.toLocaleString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
  return `${formatted} IST`;
}

function formatOrdinal(n: number): string {
  const abs = Math.abs(n);
  const mod100 = abs % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (abs % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function escapeLoginEmailHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getEmployeeLoginNotificationTemplate(
  employeeName: string,
  loginTimeIst: string,
  companyName: string,
): EmailTemplate {
  const name = escapeLoginEmailHtml(employeeName);
  const time = escapeLoginEmailHtml(loginTimeIst);
  return {
    subject: `Successful login to ${companyName} dashboard`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 36px 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Login Successful</h1>
        </div>
        <div style="padding: 36px 30px; color: #333; line-height: 1.7;">
          <p style="font-size: 16px; margin-bottom: 16px;">Dear ${name},</p>
          <p style="font-size: 15px; margin-bottom: 16px;">
            You have successfully logged in to the <strong>${escapeLoginEmailHtml(companyName)}</strong> dashboard.
          </p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; margin: 24px 0;">
            <p style="margin: 0; font-size: 15px;"><strong>Login time (IST):</strong> ${time}</p>
          </div>
          <p style="font-size: 15px; margin-bottom: 16px;">
            Please log in to the dashboard as soon as you reach the office, as it will be used for keeping the attendance.
          </p>
          <p style="font-size: 15px; margin-bottom: 16px;">
            Please make sure to log out from the system when you leave.
          </p>
          <p style="font-size: 15px; margin-top: 24px;">
            Kind regards,<br/>
            Human Resources<br/>
            ${escapeLoginEmailHtml(companyName)}
          </p>
        </div>
      </div>
    `,
  };
}

function getHrLoginNotificationTemplate(
  employeeName: string,
  employeeEmail: string,
  role: string,
  loginTimeIst: string,
  companyName: string,
): EmailTemplate {
  const name = escapeLoginEmailHtml(employeeName);
  const email = escapeLoginEmailHtml(employeeEmail);
  const roleLabel = escapeLoginEmailHtml(role);
  const time = escapeLoginEmailHtml(loginTimeIst);
  return {
    subject: `Dashboard login: ${employeeName} at ${loginTimeIst}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="padding: 36px 30px; color: #333; line-height: 1.7;">
          <p style="font-size: 15px; margin-bottom: 16px;">
            The following user has logged in to the ${escapeLoginEmailHtml(companyName)} dashboard.
          </p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; margin: 24px 0;">
            <p style="margin: 0; font-size: 15px;"><strong>Name:</strong> ${name}</p>
            <p style="margin: 8px 0 0 0; font-size: 15px;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 8px 0 0 0; font-size: 15px;"><strong>Role:</strong> ${roleLabel}</p>
            <p style="margin: 8px 0 0 0; font-size: 15px;"><strong>Login time (IST):</strong> ${time}</p>
          </div>
        </div>
      </div>
    `,
  };
}

function getEmployeeSubsequentLoginTemplate(
  employeeName: string,
  loginTimeIst: string,
  loginCountToday: number,
  companyName: string,
): EmailTemplate {
  const name = escapeLoginEmailHtml(employeeName);
  const time = escapeLoginEmailHtml(loginTimeIst);
  const ordinal = formatOrdinal(loginCountToday);
  const escapedCompany = escapeLoginEmailHtml(companyName);
  return {
    subject: `You have logged in for the ${ordinal} time today`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 36px 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Additional login today</h1>
        </div>
        <div style="padding: 36px 30px; color: #333; line-height: 1.7;">
          <p style="font-size: 16px; margin-bottom: 16px;">Dear ${name},</p>
          <p style="font-size: 15px; margin-bottom: 16px;">
            You have logged in to the <strong>${escapedCompany}</strong> dashboard for the <strong>${ordinal}</strong> time today.
          </p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; margin: 24px 0;">
            <p style="margin: 0; font-size: 15px;"><strong>Login time (IST):</strong> ${time}</p>
            <p style="margin: 8px 0 0 0; font-size: 15px;"><strong>Login count today:</strong> ${loginCountToday}</p>
          </div>
          <p style="font-size: 15px; margin-bottom: 16px;">
            This additional login is not used for attendance. Your attendance for today was recorded at your first login.
          </p>
          <p style="font-size: 15px; margin-top: 24px;">
            Kind regards,<br/>
            Human Resources<br/>
            ${escapedCompany}
          </p>
        </div>
      </div>
    `,
  };
}

function getHrSubsequentLoginTemplate(
  employeeName: string,
  employeeEmail: string,
  role: string,
  loginTimeIst: string,
  loginCountToday: number,
  companyName: string,
): EmailTemplate {
  const name = escapeLoginEmailHtml(employeeName);
  const email = escapeLoginEmailHtml(employeeEmail);
  const roleLabel = escapeLoginEmailHtml(role);
  const time = escapeLoginEmailHtml(loginTimeIst);
  const ordinal = formatOrdinal(loginCountToday);
  return {
    subject: `${employeeName} logged in for the ${ordinal} time today`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="padding: 36px 30px; color: #333; line-height: 1.7;">
          <p style="font-size: 15px; margin-bottom: 16px;">
            The following user has logged in to the ${escapeLoginEmailHtml(companyName)} dashboard for the <strong>${ordinal}</strong> time today.
            This is not an attendance punch.
          </p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; margin: 24px 0;">
            <p style="margin: 0; font-size: 15px;"><strong>Name:</strong> ${name}</p>
            <p style="margin: 8px 0 0 0; font-size: 15px;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 8px 0 0 0; font-size: 15px;"><strong>Role:</strong> ${roleLabel}</p>
            <p style="margin: 8px 0 0 0; font-size: 15px;"><strong>Login time (IST):</strong> ${time}</p>
            <p style="margin: 8px 0 0 0; font-size: 15px;"><strong>Login count today:</strong> ${loginCountToday}</p>
          </div>
        </div>
      </div>
    `,
  };
}

async function sendLoginNotificationEmails(
  payload: LoginNotificationEmailPayload,
  loginCountToday: number,
): Promise<{ employee: EmailResponse; hr: EmailResponse }> {
  const companyName = DEFAULT_COMPANY_NAME;
  const loginTime = payload.loginTime ?? new Date();
  const loginTimeIst = formatLoginTimeIst(loginTime);
  const role = payload.role?.trim() || "Employee";
  const isFirstLoginToday = loginCountToday === 1;
  const cc = [...LOGIN_NOTIFICATION_CC];

  const employeeTemplate = isFirstLoginToday
    ? getEmployeeLoginNotificationTemplate(
        payload.employeeName,
        loginTimeIst,
        companyName,
      )
    : getEmployeeSubsequentLoginTemplate(
        payload.employeeName,
        loginTimeIst,
        loginCountToday,
        companyName,
      );
  const hrTemplate = isFirstLoginToday
    ? getHrLoginNotificationTemplate(
        payload.employeeName,
        payload.employeeEmail,
        role,
        loginTimeIst,
        companyName,
      )
    : getHrSubsequentLoginTemplate(
        payload.employeeName,
        payload.employeeEmail,
        role,
        loginTimeIst,
        loginCountToday,
        companyName,
      );

  const [employee, hr] = await Promise.all([
    sendCustomEmail(payload.to, employeeTemplate, companyName, undefined, cc),
    sendCustomEmail(
      JOB_APPLICATION_HR_INBOX,
      hrTemplate,
      companyName,
      undefined,
      cc,
    ),
  ]);

  return { employee, hr };
}

export function notifySuccessfulLoginEmails(
  payload: LoginNotificationEmailPayload,
): void {
  void (async () => {
    let loginCountToday = 2;
    try {
      const { countEmployeeLoginsToday } = await import(
        "@/util/employeeActivitySession"
      );
      const counted = await countEmployeeLoginsToday(payload.employeeId);
      if (counted >= 1) {
        loginCountToday = counted;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(
        "Login count for today failed; sending subsequent-login mail:",
        message,
      );
    }

    await sendLoginNotificationEmails(payload, loginCountToday);
  })().catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("Login notification email failed (non-critical):", message);
  });
}

export async function sendPersonalReminderEmail(
  payload: PersonalReminderEmailPayload,
): Promise<EmailResponse> {
  try {
    const scheduledAtFormatted = payload.scheduledAt.toLocaleString("en-GB", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });

    const { subject, html } = getPersonalReminderEmailTemplate({
      employeeName: payload.employeeName,
      title: payload.title,
      note: payload.note,
      scheduledAtFormatted,
      appUrl: payload.appUrl,
    });

    const transporter = createTransporter();

    const mailResponse = await transporter.sendMail({
      from: `Adminstro <${DEFAULT_FROM_EMAIL}>`,
      to: payload.to,
      subject,
      html,
    });

    if (mailResponse.rejected.length > 0) {
      throw new Error("Email address was rejected or invalid");
    }

    return { success: true, messageId: mailResponse.messageId };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Personal reminder email error:", message);
    return { success: false, error: message };
  }
}


