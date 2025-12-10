// Appreciation Email Templates
import { AppreciationEmailPayload, EmailTemplate, AppreciationType } from "../types";
import { getEmailSignature, EmailSignatureConfig } from "../signature";

export const getAppreciationEmailTemplate = (
  payload: AppreciationEmailPayload,
  hrEmployee?: EmailSignatureConfig
): EmailTemplate => {
  const {
    employeeName,
    appreciationType,
    companyName = "Zairo International",
  } = payload;

  const templates: Record<AppreciationType, EmailTemplate> = {
    outstandingContribution: {
      subject: `Heartfelt Appreciation for Your Exceptional Efforts – ${employeeName}`,
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif; max-width:600px; margin:0 auto; background:#ffffff;">
          
          <div style="background: linear-gradient(135deg,#10b981,#059669); padding:40px 30px; text-align:center; border-radius:8px 8px 0 0;">
            <h1 style="color:#ffffff; margin:0; font-size:26px; font-weight:600;">Heartfelt Appreciation</h1>
          </div>
    
          <div style="padding:35px 30px; line-height:1.7; color:#333;">
    
            <p style="font-size:17px;">Dear <strong>${employeeName}</strong>,</p>
    
            <p style="font-size:15px;">
              I hope this email finds you in good health and high spirits.
            </p>
    
            <p style="font-size:15px;">
              I am writing to express my sincere appreciation for the remarkable dedication, consistency, 
              and professionalism you have shown in your work.
            </p>
    
            <p style="font-size:15px;">
              Your efforts over the past days/weeks have not only contributed to smooth operations but have 
              also created a positive impact on the overall workflow of the department. The commitment you bring 
              to your responsibilities reflects a strong sense of ownership, reliability, and willingness to go 
              the extra mile—qualities that truly make a difference in any organisation.
            </p>
    
            <p style="font-size:15px;">
              I would especially like to highlight the way you manage your tasks with clarity and confidence. 
              Your proactive approach, timely execution, and supportive attitude set a strong example for your 
              colleagues and create a motivating environment for the entire team.
            </p>
    
            <p style="font-size:15px;">
              Whether it is meeting deadlines, helping others when needed, or maintaining consistency in your 
              performance, your contribution does not go unnoticed.
            </p>
    
            <p style="font-size:15px;">
              We genuinely appreciate the time, energy, and dedication you invest in your role. Employees like 
              you play an important part in strengthening teamwork, maintaining quality, and driving the 
              organisation forward.
            </p>
    
            <p style="font-size:15px;">
              Please continue the same level of enthusiasm and excellence. If there is any support or guidance 
              you need from our side, feel free to reach out without hesitation—we are always here to assist you.
            </p>
    
            <p style="font-size:15px;">
              Thank you once again for your outstanding performance and valuable contribution.  
              <br/>Wishing you continued success in all your future tasks.
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
    

    outstandingAchievement: {
      subject: `Congratulations on Successfully Achieving Your Target – ${employeeName}`,
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif; max-width:600px; margin:0 auto; background:#ffffff;">
          
          <div style="background: linear-gradient(135deg,#3b82f6,#1d4ed8); padding:40px 30px; text-align:center; border-radius:8px 8px 0 0;">
            <h1 style="color:#ffffff; margin:0; font-size:26px; font-weight:600;">Target Completion Appreciation</h1>
          </div>
    
          <div style="padding:35px 30px; line-height:1.7; color:#333;">
    
            <p style="font-size:17px;">Dear <strong>${employeeName}</strong>,</p>
    
            <p style="font-size:15px;">
              I hope you are doing well.
            </p>
    
            <p style="font-size:15px;">
              I am pleased to extend my heartfelt appreciation for successfully completing your assigned 
              target. Your dedication, consistency, and disciplined approach have played a major role 
              in achieving this milestone.
            </p>
    
            <p style="font-size:15px;">
              Your commitment to maintaining high-quality work, even under pressure, reflects a strong 
              sense of responsibility and a professional attitude that is truly commendable. The way you 
              handled your tasks—planning, prioritizing, and executing them on time—shows your ability 
              to stay focused and deliver results with confidence.
            </p>
    
            <p style="font-size:15px;">
              Reaching your target is not just an achievement; it is a reflection of your determination, 
              hard work, and willingness to go the extra mile. You’ve set a great example for others by 
              demonstrating what can be accomplished with the right mindset and sincere effort.
            </p>
    
            <p style="font-size:15px%;">
              Your contribution has positively impacted the department’s performance and strengthened 
              the overall workflow. We value the energy and efficiency you consistently bring to your 
              role, and we appreciate the way you support the team whenever needed.
            </p>
    
            <p style="font-size:15px;">
              Please continue this level of dedication and excellence in the coming months as well. 
              If you need any assistance or guidance, feel free to reach out anytime—we are always 
              here to support you.
            </p>
    
            <p style="font-size:15px;">
              Once again, congratulations on this well-deserved achievement.<br/>
              Wishing you continued success in your upcoming goals.
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
    

    excellentAttendance: {
      subject: `Appreciation for Maintaining Full Attendance – ${employeeName}`,
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif; max-width:600px; margin:0 auto; background:#ffffff;">
          
          <div style="background: linear-gradient(135deg,#0ea5e9,#0369a1); padding:40px 30px; text-align:center; border-radius:8px 8px 0 0;">
            <h1 style="color:#ffffff; margin:0; font-size:26px; font-weight:600;">Full Attendance Appreciation</h1>
          </div>
    
          <div style="padding:35px 30px; line-height:1.7; color:#333;">
    
            <p style="font-size:17px;">Dear <strong>${employeeName}</strong>,</p>
    
            <p style="font-size:15px;">
              I hope you are doing well.
            </p>
    
            <p style="font-size:15px;">
              I am writing to express my sincere appreciation for maintaining full attendance throughout the month. 
              Your punctuality, discipline, and strong sense of responsibility truly stand out and deserve recognition.
            </p>
    
            <p style="font-size:15px;">
              Consistently being present every day reflects your dedication towards your role and your commitment to 
              contributing to the team's overall progress. In today’s fast-paced work environment, maintaining full 
              attendance is not easy, and your ability to do so showcases your reliability, time management, and 
              professional integrity.
            </p>
    
            <p style="font-size:15px;">
              Your presence has played an important part in ensuring smooth coordination within the department. By 
              staying consistent and showing up daily, you have set a strong example for others and helped maintain a 
              steady workflow. Your efforts positively influence productivity, teamwork, and overall performance.
            </p>
    
            <p style="font-size:15px;">
              We genuinely appreciate the sincerity and perseverance you bring to your job. Please continue this level 
              of professionalism and dedication as it contributes greatly to the department’s success and strengthens 
              team morale.
            </p>
    
            <p style="font-size:15px;">
              If you ever require any support or guidance, feel free to reach out anytime—we are always here to assist you.
            </p>
    
            <p style="font-size:15px;">
              Thank you once again for your excellent attendance and consistent effort.<br/>
              Wishing you continued progress in all your future tasks.
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

  return templates[appreciationType];
};

// Helper to get appreciation reason text based on type
export const getAppreciationReasonText = (appreciationType: AppreciationType): string => {
  const reasons: Record<AppreciationType, string> = {
    outstandingContribution:
      "Outstanding dedication, professionalism, and commitment to delivering high-quality results",
    outstandingAchievement:
      "Exceptional achievement in completing targets with hard work and determination",
    excellentAttendance:
      "Maintaining full attendance with punctuality, discipline, and consistent presence",
  };
  return reasons[appreciationType];
};

