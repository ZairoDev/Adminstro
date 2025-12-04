// Main Email Module - Exports all email functionality
import {
  createTransporter,
  DEFAULT_FROM_EMAIL,
  DEFAULT_COMPANY_NAME,
} from "./transporter";
import { getCandidateEmailTemplate } from "./templates/candidate";
import { getWarningEmailTemplate, getWarningReasonText } from "./templates/warning";
import { getPIPEmailTemplate, getPIPLevelDescription } from "./templates/pip";
import { getAppreciationEmailTemplate, getAppreciationReasonText } from "./templates/appreciation";
import {
  CandidateEmailPayload,
  WarningEmailPayload,
  PIPEmailPayload,
  AppreciationEmailPayload,
  EmailResponse,
  EmailTemplate,
} from "./types";
import { getActiveHREmployee } from "./getHREmployee";

// Re-export all types
export * from "./types";

// Re-export template functions
export { getCandidateEmailTemplate } from "./templates/candidate";
export { getWarningEmailTemplate, getWarningReasonText } from "./templates/warning";
export { getPIPEmailTemplate, getPIPLevelDescription } from "./templates/pip";
export { getAppreciationEmailTemplate, getAppreciationReasonText } from "./templates/appreciation";
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
    const transporter = createTransporter();

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

    console.log("✅ Candidate email sent successfully to:", payload.to);
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
    const transporter = createTransporter();

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

    console.log("✅ Warning email sent successfully to:", payload.to);
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
    const transporter = createTransporter();

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

    console.log("✅ PIP email sent successfully to:", payload.to);
    return { success: true, messageId: mailResponse.messageId };
  } catch (error: any) {
    console.error("❌ PIP email sending error:", error);
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
    const transporter = createTransporter();

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

    console.log("✅ Appreciation email sent successfully to:", payload.to);
    return { success: true, messageId: mailResponse.messageId };
  } catch (error: any) {
    console.error("❌ Appreciation email sending error:", error);
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
    const transporter = createTransporter();

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

    console.log("✅ Custom email sent successfully to:", to);
    return { success: true, messageId: mailResponse.messageId };
  } catch (error: any) {
    console.error("❌ Custom email sending error:", error);
    return { success: false, error: error.message };
  }
}


