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


