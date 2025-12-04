// PIP (Performance Improvement Plan) Email Templates
import { PIPEmailPayload, EmailTemplate, PIPLevel } from "../types";
import { getEmailSignature, EmailSignatureConfig } from "../signature";

export const getPIPEmailTemplate = (
  payload: PIPEmailPayload,
  hrEmployee?: EmailSignatureConfig
): EmailTemplate => {
  const {
    employeeName,
    pipLevel,
    startDate,
    endDate,
    concerns = [],
    issues = [],
    criticalIssues = [],
    companyName = "Zairo International",
  } = payload;

  const templates: Record<PIPLevel, EmailTemplate> = {
    level1: {
      subject: `Performance Improvement Plan – Support & Guidance for ${employeeName}`,
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif; max-width:600px; margin:0 auto; background:#ffffff;">
          <div style="background: linear-gradient(135deg,#3b82f6,#1d4ed8); padding:40px 30px; text-align:center; border-radius:8px 8px 0 0;">
            <h1 style="color:#ffffff; margin:0; font-size:26px; font-weight:600;">Performance Improvement Plan</h1>
            <p style="color:#e0e7ff; font-size:14px; margin-top:5px;">Supportive Guidance • Level 1</p>
          </div>

          <div style="padding:35px 30px; color:#333; line-height:1.7;">
            <p style="font-size:17px;">Dear ${employeeName},</p>

            <p style="font-size:15px;">
              This Performance Improvement Plan (PIP) has been created to help you improve in specific areas of your role. 
              We believe in your potential and are committed to supporting your progress.
            </p>

            <p style="font-size:15px;">
              You are being placed under a <strong>10-Day PIP</strong> starting from <strong>${startDate}</strong> to <strong>${endDate}</strong>.
            </p>

            <div style="background:#eff6ff; border-left:4px solid #3b82f6; padding:18px; margin:25px 0; border-radius:4px;">
              <p style="font-size:15px; margin:0;"><strong>Areas Requiring Improvement:</strong></p>
              <ul style="margin:12px 0 0 20px; padding:0; color:#1f2937;">
                ${concerns.map((c) => `<li style="margin:6px 0;">${c}</li>`).join("")}
              </ul>
            </div>

            <p style="font-size:15px;">
              Your progress will be monitored daily by your Team Lead and reviewed by HR. 
              This plan is intended to support your growth and improved performance.
            </p>

            <p style="font-size:15px;">Please acknowledge receipt of this email.</p>

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

    level2: {
      subject: `10-Day Performance Improvement Plan – Mandatory Compliance for ${employeeName}`,
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif; max-width:600px; margin:0 auto; background:#ffffff;">
          <div style="background: linear-gradient(135deg,#f59e0b,#d97706); padding:40px 30px; text-align:center; border-radius:8px 8px 0 0;">
            <h1 style="color:#ffffff; margin:0; font-size:26px; font-weight:600;">Performance Improvement Plan</h1>
            <p style="color:#fff7ed; font-size:14px; margin-top:5px;">Strict Monitoring • Level 2</p>
          </div>

          <div style="padding:35px 30px; color:#333; line-height:1.7;">
            <p style="font-size:17px;">Dear ${employeeName},</p>

            <p style="font-size:15px;">
              Despite previous discussions and feedback, your performance continues to fall below expectations. 
              Therefore, you are being placed under a <strong>10-Day PIP</strong> from <strong>${startDate}</strong> to <strong>${endDate}</strong>.
            </p>

            <div style="background:#fffbeb; border-left:4px solid #f59e0b; padding:18px; margin:25px 0;">
              <p style="margin:0; font-size:15px;"><strong>Major Concerns Observed:</strong></p>
              <ul style="margin:12px 0 0 20px;">
                ${issues.map((i) => `<li style="margin:6px 0;">${i}</li>`).join("")}
              </ul>
            </div>

            <div style="background:#fef3c7; border-left:4px solid #d97706; padding:18px; margin:25px 0;">
              <p style="margin:0; font-size:15px;"><strong>Expectations During the PIP:</strong></p>
              <ul style="margin:12px 0 0 20px;">
                <li>Meet daily KPIs and maintain discipline</li>
                <li>Complete tasks accurately and within deadlines</li>
                <li>Daily reporting to Team Lead + performance tracker</li>
              </ul>
            </div>

            <p style="font-size:15px;">
              Non-compliance or failure to improve may result in disciplinary actions, including role downgrade or termination.
            </p>

            <p style="font-size:15px;">Please acknowledge receipt of this email.</p>

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

    level3: {
      subject: `Final 10-Day Performance Improvement Plan – Immediate Action Required for ${employeeName}`,
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif; max-width:600px; margin:0 auto; background:#ffffff;">
          <div style="background: linear-gradient(135deg,#dc2626,#b91c1c); padding:40px 30px; text-align:center; border-radius:8px 8px 0 0;">
            <h1 style="color:#ffffff; margin:0; font-size:26px; font-weight:600;">Final Performance Improvement Plan</h1>
            <p style="color:#fee2e2; font-size:14px; margin-top:5px;">Final Warning • Level 3</p>
          </div>

          <div style="padding:35px 30px; color:#333; line-height:1.7;">
            <p style="font-size:17px;">Dear ${employeeName},</p>

            <p style="font-size:15px;">
              This email serves as your <strong>final warning</strong> regarding continued unsatisfactory performance 
              despite earlier discussions and support.
            </p>

            <p style="font-size:15px;">
              Effective <strong>${startDate}</strong>, you are placed under a <strong>Final 10-Day PIP</strong>. This is your last opportunity to show improvement.
            </p>

            <div style="background:#fee2e2; border-left:4px solid #dc2626; padding:18px; margin:25px 0;">
              <p style="margin:0; font-size:15px;"><strong>Critical Issues Identified:</strong></p>
              <ul style="margin:12px 0 0 20px;">
                ${criticalIssues.map((i) => `<li style="margin:6px 0;">${i}</li>`).join("")}
              </ul>
            </div>

            <div style="background:#fef2f2; border-left:4px solid #b91c1c; padding:18px; margin:25px 0;">
              <p style="margin:0; font-size:15px;"><strong>Mandatory Requirements:</strong></p>
              <ul style="margin:12px 0 0 20px;">
                <li>Achieve all daily targets without fail</li>
                <li>No attendance issues or behavioural violations</li>
                <li>Full cooperation with HR & Supervisor</li>
              </ul>
            </div>

            <p style="font-size:15px;">
              Failure to show required improvement will result in <strong>immediate termination</strong> without further notice.
            </p>

            <p style="font-size:15px;">Your immediate acknowledgment is required.</p>

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

  return templates[pipLevel];
};

// Helper to get PIP description based on level
export const getPIPLevelDescription = (pipLevel: PIPLevel): string => {
  const descriptions: Record<PIPLevel, string> = {
    level1: "Supportive guidance to help improve in specific areas",
    level2: "Strict monitoring due to continued performance issues",
    level3: "Final warning - last opportunity to show improvement",
  };
  return descriptions[pipLevel];
};


