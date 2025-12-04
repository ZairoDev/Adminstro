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
      subject: `Appreciation for Your Outstanding Contribution – ${employeeName}`,
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif; max-width:600px; margin:0 auto; background:#ffffff;">
          <div style="background: linear-gradient(135deg,#10b981,#059669); padding:40px 30px; text-align:center; border-radius:8px 8px 0 0;">
            <h1 style="color:#ffffff; margin:0; font-size:26px; font-weight:600;">Appreciation for Your Outstanding Contribution</h1>
          </div>

          <div style="padding:35px 30px; line-height:1.7; color:#333;">
            <p style="font-size:17px;">Dear ${employeeName},</p>

            <p style="font-size:15px;">I hope you are doing well.</p>

            <p style="font-size:15px;">
              I am writing to extend my sincere appreciation for the outstanding dedication and 
              professionalism you have consistently demonstrated. Your hard work, positive attitude,
              and commitment to delivering high-quality results have made a noticeable impact on 
              our team and overall operations.
            </p>

            <p style="font-size:15px;">
              Your ability to take initiative, handle responsibilities with confidence, and maintain 
              consistency in your performance truly reflects your dedication. We acknowledge and 
              value the effort you put into your work, and it does not go unnoticed.
            </p>

            <p style="font-size:15px;">
              Thank you for being an integral part of the team. Your continued contributions and 
              sense of ownership are genuinely appreciated, and we look forward to seeing your 
              ongoing growth and achievements.
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

    outstandingAchievement: {
      subject: `Outstanding Achievement – Keep Rising! – ${employeeName}`,
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif; max-width:600px; margin:0 auto; background:#ffffff;">
          <div style="background: linear-gradient(135deg,#8b5cf6,#7c3aed); padding:40px 30px; text-align:center; border-radius:8px 8px 0 0;">
            <h1 style="color:#ffffff; margin:0; font-size:26px; font-weight:600;">Outstanding Achievement – Keep Rising!</h1>
          </div>

          <div style="padding:35px 30px; line-height:1.7; color:#333;">
            <p style="font-size:17px;">Dear ${employeeName},</p>

            <p style="font-size:15px;">I hope you are doing well.</p>

            <p style="font-size:15px;">
              I want to extend my heartfelt appreciation for your exceptional achievement in 
              completing your target. Your hard work, determination, and unwavering focus have 
              truly paid off, and this milestone reflects the strength of your dedication.
            </p>

            <p style="font-size:15px;">
              You have shown that challenges can be turned into opportunities with the right mindset 
              and consistent effort. Your performance is not just impressive—it's inspiring. You have 
              set a strong example of commitment, discipline, and resilience for the entire team.
            </p>

            <p style="font-size:15px;">
              Your success today is a reminder of what you are capable of, and I am confident that this 
              momentum will drive even greater accomplishments in the future. Keep believing in 
              your potential and continue working with the same passion and energy.
            </p>

            <p style="font-size:15px;">
              Thank you for your remarkable contribution. Keep shining, keep pushing, and keep 
              achieving!
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

    excellentAttendance: {
      subject: `Appreciation for Your Excellent Attendance Record – ${employeeName}`,
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif; max-width:600px; margin:0 auto; background:#ffffff;">
          <div style="background: linear-gradient(135deg,#2563eb,#1d4ed8); padding:40px 30px; text-align:center; border-radius:8px 8px 0 0;">
            <h1 style="color:#ffffff; margin:0; font-size:26px; font-weight:600;">Appreciation for Your Excellent Attendance Record</h1>
          </div>

          <div style="padding:35px 30px; line-height:1.7; color:#333;">
            <p style="font-size:17px;">Dear ${employeeName},</p>

            <p style="font-size:15px;">I hope you are doing well.</p>

            <p style="font-size:15px;">
              I would like to extend my sincere appreciation for maintaining full attendance this 
              month. Your punctuality, discipline, and consistent presence reflect a strong sense of 
              responsibility and commitment towards your work.
            </p>

            <p style="font-size:15px;">
              Full attendance is not just a record—it shows dedication, reliability, and a positive 
              attitude. Your consistent presence contributes to smoother workflow, better team 
              coordination, and overall productivity. It truly sets a great example for others to follow.
            </p>

            <p style="font-size:15px;">
              Thank you for upholding such high standards of professionalism. Keep maintaining this 
              level of dedication, and continue inspiring others with your work ethic.
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

