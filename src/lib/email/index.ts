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
} from "./types";
import { getActiveHREmployee } from "./getHREmployee";

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

// Send custom email with provided template
export async function sendCustomEmail(
  to: string,
  template: EmailTemplate,
  companyName?: string
): Promise<EmailResponse> {
  try {
    const transporter = createTransporterHR();

    const mailOptions = {
      from: `${companyName || DEFAULT_COMPANY_NAME} <${DEFAULT_FROM_EMAIL}>`,
      to,
      subject: template.subject,
      html: template.html,
    };

    const mailResponse = await transporter.sendMail(mailOptions);

    if (mailResponse.rejected.length > 0) {
      throw new Error("Email address was rejected or invalid");
    }

    // Custom email sent successfully
    return { success: true, messageId: mailResponse.messageId };
  } catch (error: any) {
    console.error("❌ Custom email sending error:", error);
    return { success: false, error: error.message };
  }
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
}

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

export async function sendLoginNotificationEmails(
  payload: LoginNotificationEmailPayload,
): Promise<{ employee: EmailResponse; hr: EmailResponse }> {
  const companyName = DEFAULT_COMPANY_NAME;
  const loginTime = payload.loginTime ?? new Date();
  const loginTimeIst = formatLoginTimeIst(loginTime);
  const role = payload.role?.trim() || "Employee";
  const employeeTemplate = getEmployeeLoginNotificationTemplate(
    payload.employeeName,
    loginTimeIst,
    companyName,
  );
  const hrTemplate = getHrLoginNotificationTemplate(
    payload.employeeName,
    payload.employeeEmail,
    role,
    loginTimeIst,
    companyName,
  );

  const [employee, hr] = await Promise.all([
    sendCustomEmail(payload.to, employeeTemplate, companyName),
    sendCustomEmail(JOB_APPLICATION_HR_INBOX, hrTemplate, companyName),
  ]);

  return { employee, hr };
}

export function notifySuccessfulLoginEmails(
  payload: LoginNotificationEmailPayload,
): void {
  void sendLoginNotificationEmails(payload).catch((err: unknown) => {
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


