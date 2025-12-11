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

    forTrainees: {
      subject: `Performance Improvement Plan – Support & Guidance for ${employeeName}`,
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif; max-width:600px; margin:0 auto; background:#ffffff;">
          
          <div style="background: linear-gradient(135deg,#3b82f6,#1d4ed8); padding:40px 30px; text-align:center; border-radius:8px 8px 0 0;">
            <h1 style="color:#ffffff; margin:0; font-size:26px; font-weight:600;">Performance Improvement Plan</h1>
            <p style="color:#e0e7ff; font-size:14px; margin-top:5px;">Supportive Guidance • Level 1</p>
          </div>
    
          <div style="padding:35px 30px; color:#333; line-height:1.7;">
            
            <p style="font-size:17px;">Dear <strong>${employeeName}</strong>,</p>
    
            <p style="font-size:15px;">
              This email is to formally inform you that, based on your recent performance and conduct, 
              you are being placed on a Performance Improvement Plan (PIP) effective from 
              <strong>${startDate}</strong>.
            </p>
    
            <p style="font-size:15px;">
              Over the past few weeks, we have observed several performance gaps and behavioural concerns 
              that have impacted your overall contribution to the team. These issues 
              have been discussed previously, but the expected improvements have not been seen.
            </p>
    
            <div style="background:#eff6ff; border-left:4px solid #3b82f6; padding:18px; margin:25px 0; border-radius:4px;">
              <p style="font-size:15px; margin:0;"><strong>Key Areas of Concern:</strong></p>
              <ul style="margin:12px 0 0 20px; padding:0; color:#1f2937;">
                ${concerns.map((c) => `<li style="margin:6px 0;">${c}</li>`).join("")}
              </ul>
            </div>
    
            <p style="font-size:15px;"><strong>Performance Improvement Plan Details:</strong><br/><br/>
              You are required to work on the areas listed above as per the guidelines discussed with your manager. 
              During the PIP period, you must:
            </p>
    
            <ul style="margin:12px 0 20px 20px; padding:0; color:#1f2937;">
              <li style="margin:6px 0;">Show consistent improvement in performance and behaviour.</li>
              <li style="margin:6px 0;">Follow all team guidelines and company policies.</li>
              <li style="margin:6px 0;">Maintain punctuality and adhere to the attendance requirements.</li>
              <li style="margin:6px 0;">Meet daily/weekly targets as communicated by your manager.</li>
            </ul>
    
            <p style="font-size:15px;"><strong>Duration of PIP:</strong><br/>
              From <strong>${startDate}</strong> to <strong>${endDate}</strong>.
            </p>
    
            <p style="font-size:15px;"><strong>Review & Monitoring:</strong><br/>
              Your performance will be monitored closely during this period. You will have regular review meetings 
              with your manager to track progress and discuss support required.
            </p>
    
            <p style="font-size:15px;"><strong>Important Notice:</strong><br/>
              Failure to show satisfactory improvement during the PIP period may result in further disciplinary 
              action, up to and including termination, as per company policy.
            </p>
    
            <p style="font-size:15px;">
              You are required to acknowledge receipt of this email and attend a meeting with 
              your manager to begin the PIP process.
            </p>
    
            ${getEmailSignature(hrEmployee)}
          </div>
          
          <div style="background:#f9fafb; padding:20px 30px; text-align:center; border-radius:0 0 8px 8px; border-top:1px solid #e5e7eb;">
            <p style="font-size:12px; color:#6b7280; margin:0;">
              © ${new Date().getFullYear()} ${companyName}. All rights reserved.
            </p>
          </div>
        </div>
      `,
    },
    

    
    level1: {
      subject: `Performance Improvement Plan – Support & Guidance for ${employeeName}`,
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif; max-width:600px; margin:0 auto; background:#ffffff;">
          
          <div style="background: linear-gradient(135deg,#3b82f6,#1d4ed8); padding:40px 30px; text-align:center; border-radius:8px 8px 0 0;">
            <h1 style="color:#ffffff; margin:0; font-size:26px; font-weight:600;">Performance Improvement Plan</h1>
            <p style="color:#e0e7ff; font-size:14px; margin-top:5px;">Supportive Guidance • Level 1</p>
          </div>
    
          <div style="padding:35px 30px; color:#333; line-height:1.7;">
    
            <p style="font-size:17px;">Dear <strong>${employeeName}</strong>,</p>
    
            <p style="font-size:15px;">
              This Performance Improvement Plan (PIP) has been created to help you improve in specific
              areas of your current role. We believe you have the potential to meet expectations and we are
              committed to supporting your progress.
            </p>
    
            <p style="font-size:15px;">
              Based on our recent performance discussions, we have identified certain areas where
              improvement is required. To support you in achieving expected performance standards,
              you are being placed under a <strong>10-Day Performance Improvement Plan (PIP)</strong> starting
              from <strong>${startDate}</strong> to <strong>${endDate}</strong>.
            </p>
    
            <div style="background:#eff6ff; border-left:4px solid #3b82f6; padding:18px; margin:25px 0; border-radius:4px;">
              <p style="font-size:15px; margin:0;"><strong>Areas Requiring Improvement:</strong></p>
              <ul style="margin:12px 0 0 20px; padding:0; color:#1f2937;">
                ${concerns.map((c) => `<li style="margin:6px 0;">${c}</li>`).join("")}
              </ul>
            </div>
    
            <p style="font-size:15px;">
              We believe you can improve with the right focus and guidance. Your progress will be
              monitored daily by your Team Lead and reviewed by HR.
            </p>
    
            <p style="font-size:15px;">
              This plan is issued to guide you toward better performance and continued growth in
              your role.
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
            
            <p style="font-size:17px;">Dear <strong>${employeeName}</strong>,</p>
    
            <p style="font-size:15px;">
              Despite previous discussions, feedback, and guidance, we have observed that your
              performance continues to fall below expectations and there are repeated concerns
              regarding your overall conduct and delivery. Therefore, the management is placing you
              under a <strong>10-Day Performance Improvement Plan (PIP)</strong>, effective from 
              <strong>${startDate}</strong> to <strong>${endDate}</strong>, to closely monitor your progress and ensure 
              immediate and measurable improvement.
            </p>
    
            <div style="background:#fffbeb; border-left:4px solid #f59e0b; padding:18px; margin:25px 0; border-radius:4px;">
              <p style="margin:0; font-size:15px;"><strong>Major Concerns Observed:</strong></p>
              <ul style="margin:12px 0 0 20px; padding:0;">
                ${issues.map(i => `<li style="margin:6px 0;">${i}</li>`).join("")}
              </ul>
            </div>
    
            <div style="background:#fef3c7; border-left:4px solid #d97706; padding:18px; margin:25px 0; border-radius:4px;">
              <p style="margin:0; font-size:15px;"><strong>Expectations During PIP:</strong></p>
              <ul style="margin:12px 0 0 20px; padding:0;">
                <li>Meet daily KPIs and maintain discipline</li>
                <li>Complete assigned tasks accurately and within deadlines</li>
                <li>Daily reporting to Team Lead + performance tracker submission</li>
              </ul>
            </div>
    
            <p style="font-size:15px;">
              Please note that this is a serious corrective action, and strict monitoring will be done
              by HR.
            </p>
    
            <p style="font-size:15px;">
              Non-compliance or failure to show measurable improvement may lead to major
              disciplinary actions, including role downgrade or termination.
            </p>
    
            <p style="font-size:15px;">
              Kindly acknowledge this email as confirmation of receiving the plan.
            </p>
    
            ${getEmailSignature(hrEmployee)}
          </div>
    
          <div style="background:#f9fafb; padding:20px 30px; text-align:center; border-radius:0 0 8px 8px; border-top:1px solid #e5e7eb;">
            <p style="font-size:12px; color:#6b7280; margin:0;">
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
    
            <p style="font-size:17px;">Dear <strong>${employeeName}</strong>,</p>
    
            <p style="font-size:15px;">
              This email serves as a <strong>final warning</strong> regarding your continued unsatisfactory
              performance and violation of company expectations, despite earlier warnings and
              support.
            </p>
    
            <p style="font-size:15px;">
              Effective <strong>${startDate}</strong>, you are placed under a <strong>Final 10-Day Performance
              Improvement Plan (PIP)</strong>. This will be your last opportunity to demonstrate the
              required improvements in performance and behaviour.
            </p>
    
            <div style="background:#fee2e2; border-left:4px solid #dc2626; padding:18px; margin:25px 0; border-radius:4px;">
              <p style="margin:0; font-size:15px;"><strong>Critical Issues Identified:</strong></p>
              <ul style="margin:12px 0 0 20px;">
                ${criticalIssues.map((i) => `<li style="margin:6px 0;">${i}</li>`).join("")}
              </ul>
            </div>
    
            <div style="background:#fef2f2; border-left:4px solid #b91c1c; padding:18px; margin:25px 0; border-radius:4px;">
              <p style="margin:0; font-size:15px;"><strong>Mandatory Requirements:</strong></p>
              <ul style="margin:12px 0 0 20px;">
                <li>Achievement of all daily targets without fail</li>
                <li>No attendance issues or behavioural violations</li>
                <li>Full cooperation with HR and Supervisor monitoring</li>
              </ul>
            </div>
    
            <p style="font-size:15px;">
              Failure to meet the required performance during or after this plan will result in
              <strong>termination of your employment</strong> without further notice.
            </p>
    
            <p style="font-size:15px;">
              Your immediate acknowledgment of this PIP is expected.
            </p>
    
            ${getEmailSignature(hrEmployee)}
          </div>
    
          <div style="background:#f9fafb; padding:20px 30px; text-align:center; border-radius:0 0 8px 8px; border-top:1px solid #e5e7eb;">
            <p style="font-size:12px; color:#6b7280; margin:0;">
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
    forTrainees: "Supportive guidance and training for new team members",
    level1: "Supportive guidance to help improve in specific areas",
    level2: "Strict monitoring due to continued performance issues",
    level3: "Final warning - last opportunity to show improvement",
  };
  return descriptions[pipLevel];
};


