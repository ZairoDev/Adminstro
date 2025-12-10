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
            
            <p style="font-size:17px;">Dear <strong>${employeeName}</strong>,</p>
    
            <p style="font-size:15px;">
              This email is being issued as a formal warning regarding your recent conduct in the
              <strong>${department}</strong>. We have observed multiple instances where your behaviour
              and adherence to company discipline standards have not been satisfactory.
            </p>
    
            <p style="font-size:15px;">
              Despite previous verbal reminders, the concerns continue to persist and are affecting
              team efficiency and workflow. As a member of the <strong>${department}</strong>, maintaining
              professionalism, following instructions, and adhering to company policies are essential
              parts of your role.
            </p>
    
            <div style="background:#fef2f2; border-left:4px solid #dc2626; padding:18px; margin:25px 0; border-radius:4px;">
              <p style="margin:0; font-size:15px;">
                <strong>You are hereby advised to:</strong><br/><br/>
                • Maintain proper workplace discipline at all times.<br/>
                • Follow team guidelines and instructions given by your manager.<br/>
                • Ensure that your behaviour supports a positive and productive work environment.
              </p>
            </div>
    
            <p style="font-size:15px;">
              Please consider this a formal warning. Any further disciplinary concerns may lead to
              stricter actions as per company policy.
            </p>
    
            <p style="font-size:15px;">
              You are expected to acknowledge this email and schedule a discussion with
              <strong>${reportingManager}</strong> by <strong>${date}</strong> to clarify expectations and align on improvements.
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
    
    lateAttendance: {
  subject: `Formal Warning for Late Attendance - ${employeeName}`,
  html: `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      
      <div style="background: linear-gradient(135deg, #f97316 0%, #c2410c 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 600;">Formal Warning</h1>
      </div>

      <div style="padding: 35px 30px; color: #333; line-height: 1.7;">
        
        <p style="font-size:17px;">Dear <strong>${employeeName}</strong>,</p>

        <p style="font-size:15px;">
          This email serves as a formal warning regarding your repeated instances of late attendance.
          We have consistently observed delays in your reporting time, despite prior reminders and discussions.
        </p>

        <p style="font-size:15px;">
          Punctuality is essential for the smooth functioning of the <strong>${department}</strong>, especially as workflow 
          and target assignments begin at the scheduled start time. Your frequent late arrivals impact team coordination 
          and overall productivity.
        </p>

        <div style="background:#fff7ed; border-left:4px solid #f97316; padding:18px; margin:25px 0; border-radius:4px;">
          <p style="margin:0; font-size:15px;">
            <strong>You are hereby advised to:</strong><br/><br/>
            • Report to work on time as per the company attendance policy.<br/>
            • Ensure proper planning to avoid delays in the future.<br/>
            • Maintain consistent punctuality to support team performance.
          </p>
        </div>

        <p style="font-size:15px;">
          Please consider this as an official warning. Continued late attendance may lead to stricter disciplinary action 
          as per company policy.
        </p>

        <p style="font-size:15px;">
          You are required to acknowledge this email and meet with <strong>${reportingManager}</strong> by 
          <strong>${date}</strong> to discuss corrective measures.
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

unplannedLeaves: {
  subject: `Formal Warning for Unplanned Leaves - ${employeeName}`,
  html: `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      
      <div style="background: linear-gradient(135deg, #f43f5e 0%, #be123c 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 600;">Formal Warning</h1>
      </div>

      <div style="padding: 35px 30px; color: #333; line-height: 1.7;">
        
        <p style="font-size:17px;">Dear <strong>${employeeName}</strong>,</p>

        <p style="font-size:15px;">
          This email is being issued as a formal warning regarding your repeated instances of unplanned 
          and short-notice leaves. We have observed multiple occurrences where you have taken leave 
          without prior approval or timely intimation.
        </p>

        <p style="font-size:15px;">
          Such unplanned absences disrupt the workflow of the <strong>${department}</strong>, affect lead 
          assignments, and create avoidable delays in team productivity. Despite earlier reminders to 
          follow the proper leave protocol, this pattern continues.
        </p>

        <div style="background:#fdf2f8; border-left:4px solid #f43f5e; padding:18px; margin:25px 0; border-radius:4px;">
          <p style="margin:0; font-size:15px;">
            <strong>You are hereby advised to:</strong><br/><br/>
            • Avoid taking unplanned leaves unless in genuine emergencies.<br/>
            • Inform your manager well in advance and follow the proper leave approval process.<br/>
            • Maintain regular attendance to ensure smooth functioning of team operations.
          </p>
        </div>

        <p style="font-size:15px;">
          Please consider this a formal warning. Continued unplanned leaves may lead to further 
          disciplinary action as per company policy.
        </p>

        <p style="font-size:15px;">
          You are expected to acknowledge this email and connect with 
          <strong>${reportingManager}</strong> by <strong>${date}</strong> to discuss compliance going forward.
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

poshWarning: {
  subject: `Formal Warning Regarding POSH Policy Concerns - ${employeeName}`,
  html: `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      
      <div style="background: linear-gradient(135deg, #7e22ce 0%, #5b21b6 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 600;">Formal Warning</h1>
      </div>

      <div style="padding: 35px 30px; color: #333; line-height: 1.7;">

        <p style="font-size:17px;">Dear <strong>${employeeName}</strong>,</p>

        <p style="font-size:15px;">
          This email is being issued as a formal warning regarding concerns raised about your recent behaviour, 
          which may be in violation of the company’s POSH (Prevention of Sexual Harassment) Policy.
        </p>

        <p style="font-size:15px;">
          We have received reports indicating that certain comments/actions from your side have made colleagues 
          uncomfortable. Such behaviour is not acceptable in the workplace and is taken very seriously under 
          the POSH Act, 2013.
        </p>

        <p style="font-size:15px;">
          As discussed, the company follows a zero-tolerance approach to any conduct that compromises the dignity, 
          safety, or comfort of any employee.
        </p>

        <div style="background:#f3e8ff; border-left:4px solid #7e22ce; padding:18px; margin:25px 0; border-radius:4px;">
          <p style="margin:0; font-size:15px;">
            <strong>You are hereby instructed to:</strong><br/><br/>
            • Strictly adhere to the company’s POSH policy at all times.<br/>
            • Maintain professional and respectful communication with all colleagues.<br/>
            • Avoid any comments, gestures, or behaviour that could be perceived as inappropriate or uncomfortable.<br/>
            • Cooperate fully with any further review or inquiry, if required.
          </p>
        </div>

        <p style="font-size:15px;">
          Please consider this a formal warning. Any further incident or non-compliance may result in severe 
          disciplinary action, including suspension or termination, as per company policy and legal guidelines.
        </p>

        <p style="font-size:15px;">
          You are required to acknowledge this email and meet with <strong>${reportingManager}</strong> on 
          <strong>${date}</strong> to reaffirm your understanding of the POSH policy and expected workplace conduct.
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

combinedWarning: {
  subject: `Formal Combined Warning - ${employeeName}`,
  html: `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; margin: 0 auto; background: #ffffff;">
      
      <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 600;">Formal Combined Warning</h1>
      </div>

      <div style="padding: 35px 30px; color: #333; line-height: 1.7;">

        <p style="font-size:17px;">Dear <strong>${employeeName}</strong>,</p>

        <p style="font-size:15px;">
          This email serves as a formal combined warning regarding multiple concerns observed in your recent 
          conduct and performance within the <strong>${department}</strong>. Despite prior verbal reminders, the 
          following issues continue to persist:
        </p>

        <p style="font-size:15px;"><strong>1. Discipline Issue</strong><br/>
          There have been repeated instances of behaviour that do not align with company standards of 
          professionalism and workplace conduct.
        </p>

        <p style="font-size:15px;"><strong>2. Unplanned Leaves</strong><br/>
          You have taken multiple unplanned leaves without prior approval or proper intimation, which has 
          affected team workflow and productivity.
        </p>

        <p style="font-size:15px;"><strong>3. Late Attendance</strong><br/>
          Frequent late arrivals have been recorded, impacting the department’s operational schedule and 
          coordination.
        </p>

        <p style="font-size:15px;"><strong>4. POSH-Related Concerns</strong><br/>
          Certain comments or actions from your side have raised concerns under the POSH (Prevention of Sexual 
          Harassment) guidelines. The company enforces a strict zero-tolerance policy regarding any behaviour 
          that may compromise the dignity or comfort of colleagues.
        </p>

        <div style="background:#fef3c7; border-left:4px solid #f59e0b; padding:18px; margin:25px 0; border-radius:4px;">
          <p style="margin:0; font-size:15px;">
            <strong>Immediate Expectations</strong><br/><br/>
            • Maintain discipline and follow all company rules and behavioural guidelines.<br/>
            • Avoid unplanned leaves unless in genuine emergencies and follow the leave approval process.<br/>
            • Report to work on time and adhere to the attendance policy.<br/>
            • Strictly follow POSH guidelines and ensure respectful communication and conduct at all times.
          </p>
        </div>

        <p style="font-size:15px;"><strong>Important Notice</strong><br/>
          Please consider this email as an official warning. Any further violation of company policies may lead 
          to serious disciplinary action, including suspension or termination.
        </p>

        <p style="font-size:15px;">
          You are required to:<br/><br/>
          • Acknowledge this email, and<br/>
          • Attend a meeting with <strong>${reportingManager}</strong> on <strong>${dateTime}</strong> to 
          discuss corrective actions moving forward.
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



