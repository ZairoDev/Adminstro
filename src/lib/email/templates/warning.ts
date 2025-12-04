// Warning Email Templates
import { WarningEmailPayload, EmailTemplate, WarningType } from "../types";
import { getEmailSignature, EmailSignatureConfig } from "../signature";

export const getWarningEmailTemplate = (
  payload: WarningEmailPayload,
  hrEmployee?: EmailSignatureConfig
): EmailTemplate => {
  const {
    employeeName,
    warningType,
    department,
    reportingManager,
    date,
    companyName = "Zairo International",
    dateTime,
  } = payload;

  const templates: Record<WarningType, EmailTemplate> = {
    disciplineIssue: {
      subject: `Formal Warning for Discipline Issue - ${employeeName}`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <div style="background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 600;">Formal Warning</h1>
          </div>
          <div style="padding: 35px 30px; color: #333; line-height: 1.7;">
            <p style="font-size: 17px;">Dear ${employeeName},</p>
            <p style="font-size: 15px;">
              This email is being issued as a formal warning regarding your recent conduct in the 
              <strong>${department}</strong>. Multiple instances of improper behaviour and non-compliance 
              with workplace discipline have been observed.
            </p>
            <p style="font-size: 15px;">
              Despite previous verbal reminders, these concerns continue and are affecting the team's workflow and performance.
            </p>
            <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 18px; margin: 25px 0; border-radius: 4px;">
              <p style="margin:0; font-size: 15px;">
                <strong>You are hereby advised to:</strong><br/>
                • Maintain proper workplace discipline.<br/>
                • Follow all instructions issued by your manager.<br/>
                • Ensure your behaviour supports a positive and productive environment.
              </p>
            </div>
            <p style="font-size: 15px;">
              Please consider this a formal warning. Further violations may lead to stricter actions as per company policy.
            </p>
            <p style="font-size: 15px;">
              You are expected to acknowledge this communication and schedule a discussion with 
              <strong>${reportingManager}</strong> by <strong>${date}</strong>.
            </p>
            ${getEmailSignature(hrEmployee)}
          </div>
          <div style="background: #f9fafb; padding: 20px 30px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 12px; color: #6b7280; margin: 0;">
              © ${new Date().getFullYear()} ${companyName}. All rights reserved.
            </p>
          </div>
        </div>
      `,
    },
    lateAttendance: {
      subject: `Formal Warning for Late Attendance - ${employeeName}`,
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif; max-width:600px; margin:0 auto; background:#fff;">
          <div style="background: linear-gradient(135deg,#f59e0b,#d97706); padding:40px 30px; text-align:center; border-radius:8px 8px 0 0;">
            <h1 style="color:#fff; margin:0; font-size:26px;">Late Attendance Warning</h1>
          </div>
          <div style="padding:35px 30px; color:#333; line-height:1.7;">
            <p style="font-size:17px;">Dear ${employeeName},</p>
            <p style="font-size:15px;">
              This email serves as a formal warning regarding your repeated late attendance in the 
              <strong>${department}</strong>. Despite prior reminders, delays in your reporting time continue.
            </p>
            <p style="font-size:15px;">
              Your frequent late arrivals are impacting workflow, coordination, and team productivity.
            </p>
            <div style="background:#fff7ed; border-left:4px solid #f59e0b; padding:18px; margin:25px 0; border-radius:4px;">
              <p style="margin:0; font-size:15px;">
                <strong>You are advised to:</strong><br/>
                • Report on time as per attendance policy.<br/>
                • Plan your schedule to avoid delays.<br/>
                • Maintain punctuality consistently.
              </p>
            </div>
            <p style="font-size:15px;">
              You are required to acknowledge this email and meet with 
              <strong>${reportingManager}</strong> by <strong>${date}</strong> to discuss corrective measures.
            </p>
            ${getEmailSignature(hrEmployee)}
          </div>
          <div style="background: #f9fafb; padding: 20px 30px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 12px; color: #6b7280; margin: 0;">
              © ${new Date().getFullYear()} ${companyName}. All rights reserved.
            </p>
          </div>
        </div>
      `,
    },
    unplannedLeaves: {
      subject: `Formal Warning for Unplanned Leaves - ${employeeName}`,
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif; max-width:600px; margin:0 auto; background:#fff;">
          <div style="background: linear-gradient(135deg,#3b82f6,#1d4ed8); padding:40px 30px; text-align:center; border-radius:8px 8px 0 0;">
            <h1 style="color:#fff; font-size:26px; margin:0;">Unplanned Leave Warning</h1>
          </div>
          <div style="padding:35px 30px; color:#333; line-height:1.7;">
            <p style="font-size:17px;">Dear ${employeeName},</p>
            <p style="font-size:15px;">
              This email is a formal warning regarding your repeated unplanned and short-notice leaves 
              in the <strong>${department}</strong>. Such absences have disrupted workflow and lead assignments.
            </p>
            <div style="background:#eff6ff; border-left:4px solid #1d4ed8; padding:18px; margin:25px 0; border-radius:4px;">
              <p style="margin:0; font-size:15px;">
                <strong>You are advised to:</strong><br/>
                • Avoid unplanned leaves except in genuine emergencies.<br/>
                • Follow proper leave approval procedures.<br/>
                • Maintain regular attendance to support teamwork.
              </p>
            </div>
            <p style="font-size:15px;">
              Please acknowledge this email and connect with <strong>${reportingManager}</strong> by 
              <strong>${date}</strong>.
            </p>
            ${getEmailSignature(hrEmployee)}
          </div>
          <div style="background: #f9fafb; padding: 20px 30px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 12px; color: #6b7280; margin: 0;">
              © ${new Date().getFullYear()} ${companyName}. All rights reserved.
            </p>
          </div>
        </div>
      `,
    },
    poshWarning: {
      subject: `Formal POSH Warning - ${employeeName}`,
      html: `
        <div style="font-family: 'Segoe UI', Arial; max-width:600px; margin:0 auto; background:#fff;">
          <div style="background: linear-gradient(135deg,#8b5cf6,#7c3aed); padding:40px 30px; text-align:center; border-radius:8px 8px 0 0;">
            <h1 style="color:#fff; margin:0; font-size:26px;">POSH Policy Warning</h1>
          </div>
          <div style="padding:35px 30px; color:#333; line-height:1.7;">
            <p style="font-size:17px;">Dear ${employeeName},</p>
            <p style="font-size:15px;">
              This formal warning is being issued regarding concerns related to your behaviour, which may 
              violate the company's POSH (Prevention of Sexual Harassment) Policy.
            </p>
            <p style="font-size:15px;">
              Reports indicate that certain comments/actions have made colleagues uncomfortable. Such 
              conduct is taken very seriously.
            </p>
            <div style="background:#faf5ff; border-left:4px solid #7c3aed; padding:18px; margin:25px 0; border-radius:4px;">
              <p style="margin:0; font-size:15px;">
                <strong>You are instructed to:</strong><br/>
                • Adhere strictly to POSH policy.<br/>
                • Maintain respectful communication.<br/>
                • Avoid any inappropriate behaviour.<br/>
                • Cooperate with ongoing inquiry if required.
              </p>
            </div>
            <p style="font-size:15px;">
              Acknowledge this email and attend a meeting with <strong>${reportingManager}</strong> on 
              <strong>${date}</strong>.
            </p>
            ${getEmailSignature(hrEmployee)}
          </div>
          <div style="background: #f9fafb; padding: 20px 30px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 12px; color: #6b7280; margin: 0;">
              © ${new Date().getFullYear()} ${companyName}. All rights reserved.
            </p>
          </div>
        </div>
      `,
    },
    combinedWarning: {
      subject: `Combined Formal Warning Notice - ${employeeName}`,
      html: `
        <div style="font-family:'Segoe UI',Arial; max-width:600px; margin:0 auto; background:#fff;">
          <div style="background: linear-gradient(135deg,#dc2626,#b91c1c); padding:40px 30px; text-align:center; border-radius:8px 8px 0 0;">
            <h1 style="color:#fff; font-size:26px; margin:0;">Combined Warning Notice</h1>
          </div>
          <div style="padding:35px 30px; line-height:1.7; color:#333;">
            <p style="font-size:17px;">Dear ${employeeName},</p>
            <p style="font-size:15px;">
              This is a formal combined warning regarding multiple issues observed in your conduct within 
              the <strong>${department}</strong>.
            </p>
            <div style="background:#fef2f2; border-left:4px solid #dc2626; padding:18px; margin:25px 0;">
              <p style="margin:0; font-size:15px;">
                <strong>Issues Identified:</strong><br/>
                1. Discipline issues<br/>
                2. Unplanned leaves<br/>
                3. Late attendance<br/>
                4. POSH-related concerns
              </p>
            </div>
            <div style="background:#f1f5f9; border-left:4px solid #64748b; padding:18px; margin:25px 0;">
              <strong>Immediate Expectations:</strong><br/>
              • Follow company rules and policies<br/>
              • Avoid unplanned leaves<br/>
              • Maintain punctuality<br/>
              • Follow POSH guidelines strictly
            </div>
            <p style="font-size:15px;">
              You are required to acknowledge this email and attend a meeting with 
              <strong>${reportingManager}</strong> on <strong>${dateTime || date}</strong>.
            </p>
            ${getEmailSignature(hrEmployee)}
          </div>
          <div style="background: #f9fafb; padding: 20px 30px; text-align: center; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 12px; color: #6b7280; margin: 0;">
              © ${new Date().getFullYear()} ${companyName}. All rights reserved.
            </p>
          </div>
        </div>
      `,
    },
  };

  return templates[warningType];
};

// Helper to get warning reason text based on type
export const getWarningReasonText = (warningType: WarningType): string => {
  const reasons: Record<WarningType, string> = {
    disciplineIssue:
      "Improper behaviour and non-compliance with workplace discipline",
    lateAttendance: "Repeated late attendance affecting workflow",
    unplannedLeaves:
      "Frequent unplanned and short-notice leaves disrupting work",
    poshWarning:
      "Behaviour concerns related to POSH (Prevention of Sexual Harassment) Policy",
    combinedWarning:
      "Multiple issues including discipline, attendance, leaves, and conduct",
  };
  return reasons[warningType];
};



