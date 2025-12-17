// Termination and Suspension Email Templates
import { HREmployee } from "../getHREmployee";

import { getEmailSignature, EmailSignatureConfig } from "../signature";
import { DEFAULT_COMPANY_NAME } from "../transporter";

export type SeparationType = "terminated" | "suspended" | "abscond";

export interface SeparationEmailPayload {
  to: string;
  employeeName: string;
  separationType: SeparationType;
  effectiveDate: string;
  reason?: string;
  companyName?: string;
}

export interface SeparationEmailTemplate {
  subject: string;
  html: string;
}

export const SEPARATION_TYPE_LABELS: Record<SeparationType, string> = {
  terminated: "Termination",
  suspended: "Suspension",
  abscond: "Absconding",
};

// Get termination email template
const getTerminationTemplate = (
  employeeName: string,
  effectiveDate: string,
  reason: string,
  companyName: string,
  hrEmployee: EmailSignatureConfig
): SeparationEmailTemplate => {
  const signature = getEmailSignature(hrEmployee);

  return {
    subject: `Termination of Employment – ${employeeName}`,
  html: `
    <div style="font-family:'Segoe UI',Arial,sans-serif; max-width:600px; margin:0 auto; background:#ffffff;">
      
      <div style="background: linear-gradient(135deg,#dc2626,#b91c1c); padding:40px 30px; text-align:center; border-radius:8px 8px 0 0;">
        <h1 style="color:#ffffff; margin:0; font-size:26px; font-weight:600;">Termination of Employment</h1>
      </div>

      <div style="padding:35px 30px; line-height:1.7; color:#333;">
        
        <p style="font-size:17px;">
          Dear <strong>${employeeName}</strong>,
        </p>

        <p style="font-size:15px;">
          This is to inform you that your employment with <strong>${companyName}</strong> stands terminated
          effective <strong>${effectiveDate}</strong>, due to non-compliance with company policies and
          unsatisfactory conduct and/or performance.
        </p>

        <p style="font-size:15px;">
          Despite prior communications and opportunities provided for improvement and response, there has
          been no corrective action from your end. Accordingly, the management has taken this decision as
          per the company’s rules, regulations, and policies.
        </p>

        <div style="background:#fef2f2; border-left:4px solid #dc2626; padding:16px 18px; margin:22px 0; border-radius:4px;">
          <p style="margin:0; font-size:14px; color:#7f1d1d;">
            <strong>Full & Final Settlement:</strong><br/>
            Please note that your Full & Final (FNF) settlement, if applicable, will be processed after
            <strong>45 working days</strong> from your last working date, as per company policy.
          </p>
        </div>

        <p style="font-size:15px;">
          You are requested to return all company assets, documents, and access credentials (if any)
          to the HR department immediately.
        </p>

        <p style="font-size:15px;">
          For any clarification, you may reach out to the HR department within official working hours.
        </p>

        <p style="font-size:15px; margin-top:30px;">Regards,</p>
        <p style="font-size:15px; font-weight:600;">${companyName} HR Team</p>
      </div>

      ${signature}

      <div style="background:#f1f5f9; padding:20px; text-align:center; border-radius:0 0 8px 8px;">
        <p style="margin:0; font-size:12px; color:#64748b;">
          This is an official communication from ${companyName} HR Department.
        </p>
      </div>
    </div>
  `
  };
};

// Get suspension email template
const getSuspensionTemplate = (
  employeeName: string,
  effectiveDate: string,
  reason: string,
  companyName: string,
  hrEmployee: EmailSignatureConfig
): SeparationEmailTemplate => {
  const signature = getEmailSignature(hrEmployee);

  return {
    subject: `Notice of Suspension – ${employeeName}`,
    html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif; max-width:600px; margin:0 auto; background:#ffffff;">
        <div style="background: linear-gradient(135deg,#f59e0b,#d97706); padding:40px 30px; text-align:center; border-radius:8px 8px 0 0;">
          <h1 style="color:#ffffff; margin:0; font-size:26px; font-weight:600;">Notice of Suspension</h1>
        </div>
        
        <div style="padding:35px 30px; line-height:1.7; color:#333;">
          <p style="font-size:17px;">Dear ${employeeName},</p>
          
          <p style="font-size:15px;">
            We are writing to inform you that you have been placed on suspension from your duties at <strong>${companyName}</strong>, effective <strong>${effectiveDate}</strong>.
          </p>
          
          ${reason ? `
          <div style="background:#fffbeb; border-left:4px solid #f59e0b; padding:15px 20px; margin:20px 0; border-radius:0 8px 8px 0;">
            <p style="margin:0; font-size:14px; color:#92400e;">
              <strong>Reason for Suspension:</strong><br/>
              ${reason}
            </p>
          </div>
          ` : ''}
          
          <p style="font-size:15px;">
            During the suspension period, you are required to refrain from attending the workplace or accessing company systems unless specifically instructed by HR or management.
          </p>
          
          <div style="background:#f8fafc; padding:20px; border-radius:8px; margin:20px 0;">
            <h3 style="margin:0 0 15px 0; font-size:16px; color:#1e293b;">Important Information:</h3>
            <ul style="margin:0; padding-left:20px; color:#475569; font-size:14px;">
              <li style="margin-bottom:8px;">Your suspension is pending further investigation or review.</li>
              <li style="margin-bottom:8px;">You must remain available for any meetings or communications from HR.</li>
              <li style="margin-bottom:8px;">Your access to company premises and systems may be temporarily restricted.</li>
              <li style="margin-bottom:8px;">Further communication regarding the outcome will be provided in due course.</li>
            </ul>
          </div>
          
          <p style="font-size:15px;">
            We understand this may be a difficult time. If you have any questions or need clarification, please contact the HR department directly.
          </p>
          
          <p style="font-size:15px; margin-top:30px;">Regards,</p>
          <p style="font-size:15px; font-weight:600; color:#d97706;">${companyName} HR Team</p>
        </div>
        
        ${signature}
        
        <div style="background:#f1f5f9; padding:20px; text-align:center; border-radius:0 0 8px 8px;">
          <p style="margin:0; font-size:12px; color:#64748b;">
            This is an official communication from ${companyName} HR Department.
          </p>
        </div>
      </div>
    `,
  };
};

// Get abscond email template
const getAbscondTemplate = (
  employeeName: string,
  effectiveDate: string,
  reason: string,
  companyName: string,
  hrEmployee: EmailSignatureConfig
): SeparationEmailTemplate => {
  const signature = getEmailSignature(hrEmployee);

  return {
    subject: `Notice of Absconding from Employment – ${employeeName}`,
    html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif; max-width:600px; margin:0 auto; background:#ffffff;">
        <div style="background: linear-gradient(135deg,#7c3aed,#6d28d9); padding:40px 30px; text-align:center; border-radius:8px 8px 0 0;">
          <h1 style="color:#ffffff; margin:0; font-size:26px; font-weight:600;">Notice of Absconding from Employment</h1>
        </div>
        
        <div style="padding:35px 30px; line-height:1.7; color:#333;">
          <p style="font-size:17px;">Dear ${employeeName},</p>
          
          <p style="font-size:15px;">
            This letter is to formally notify you that you have been marked as <strong>absconding</strong> from your duties at <strong>${companyName}</strong>, effective <strong>${effectiveDate}</strong>.
          </p>
          
          <div style="background:#f5f3ff; border-left:4px solid #7c3aed; padding:15px 20px; margin:20px 0; border-radius:0 8px 8px 0;">
            <p style="margin:0; font-size:14px; color:#5b21b6;">
              <strong>Notice:</strong><br/>
              You have been absent from work without prior notice, approval, or any communication with your reporting manager or HR department.
            </p>
          </div>
          
          ${reason ? `
          <div style="background:#fef2f2; border-left:4px solid #dc2626; padding:15px 20px; margin:20px 0; border-radius:0 8px 8px 0;">
            <p style="margin:0; font-size:14px; color:#991b1b;">
              <strong>Additional Notes:</strong><br/>
              ${reason}
            </p>
          </div>
          ` : ''}
          
          <p style="font-size:15px;">
            As per company policy, absconding from employment without proper notice or handover is a serious violation of your employment terms.
          </p>
          
          <div style="background:#f8fafc; padding:20px; border-radius:8px; margin:20px 0;">
            <h3 style="margin:0 0 15px 0; font-size:16px; color:#1e293b;">Important Notice:</h3>
            <ul style="margin:0; padding-left:20px; color:#475569; font-size:14px;">
              <li style="margin-bottom:8px;">Your employment stands terminated due to absconding.</li>
              <li style="margin-bottom:8px;">Any pending dues will be processed as per company policy and applicable deductions.</li>
              <li style="margin-bottom:8px;">You are required to return all company property immediately.</li>
              <li style="margin-bottom:8px;">Your access to all company systems has been revoked.</li>
              <li style="margin-bottom:8px;">This may affect your experience letter and future references.</li>
            </ul>
          </div>
          
          <p style="font-size:15px;">
            If there has been any misunderstanding or if you have a valid reason for your absence, please contact the HR department immediately to discuss your situation.
          </p>
          
          <p style="font-size:15px; margin-top:30px;">Regards,</p>
          <p style="font-size:15px; font-weight:600; color:#7c3aed;">${companyName} HR Team</p>
        </div>
        
        ${signature}
        
        <div style="background:#f1f5f9; padding:20px; text-align:center; border-radius:0 0 8px 8px;">
          <p style="margin:0; font-size:12px; color:#64748b;">
            This is an official communication from ${companyName} HR Department.
          </p>
        </div>
      </div>
    `,
  };
};

// Main function to get separation email template
export const getSeparationEmailTemplate = (
  payload: SeparationEmailPayload,
  hrEmployee: EmailSignatureConfig
): SeparationEmailTemplate => {
  const companyName = payload.companyName || DEFAULT_COMPANY_NAME;
  const reason = payload.reason || "";

  if (payload.separationType === "terminated") {
    return getTerminationTemplate(
      payload.employeeName,
      payload.effectiveDate,
      reason,
      companyName,
      hrEmployee
    );
  } else if (payload.separationType === "abscond") {
    return getAbscondTemplate(
      payload.employeeName,
      payload.effectiveDate,
      reason,
      companyName,
      hrEmployee
    );
  } else {
    return getSuspensionTemplate(
      payload.employeeName,
      payload.effectiveDate,
      reason,
      companyName,
      hrEmployee
    );
  }
};

// Get separation reason text for display
export const getSeparationReasonText = (type: SeparationType): string => {
  return SEPARATION_TYPE_LABELS[type] || "Separation";
};

