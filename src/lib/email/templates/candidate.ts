// Candidate Email Templates
import { CandidateEmailPayload, EmailTemplate } from "../types";
import { getEmailSignature, EmailSignatureConfig } from "../signature";

export const getCandidateEmailTemplate = (
  payload: CandidateEmailPayload,
  hrEmployee?: EmailSignatureConfig
): EmailTemplate => {
  const {
    candidateName,
    status,
    position,
    companyName = "Zairo International",
    selectionDetails,
    rejectionReason,
    shortlistRoles,
  } = payload;

  const templates: Record<CandidateEmailPayload["status"], EmailTemplate> = {
    onboarding: {
      subject: `🎉 Welcome to ${companyName} - Complete Your Onboarding`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Welcome Aboard! 🚀</h1>
          </div>
          
          <div style="padding: 40px 30px; color: #333; line-height: 1.8;">
            <p style="font-size: 18px; color: #1f2937; margin-bottom: 20px;">Dear ${candidateName},</p>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              We're thrilled to officially welcome you to the <strong>${companyName}</strong> family! Your journey as our new <strong>${position}</strong> begins now, and we couldn't be more excited to have you on board.
            </p>
            
            <div style="background: #f0f9ff; border-left: 4px solid #2563eb; padding: 20px; margin: 30px 0; border-radius: 4px;">
              <p style="margin: 0; font-size: 16px; color: #1e40af;">
                <strong>📋 Next Step:</strong> Complete your onboarding process to get started with your role and access all necessary resources.
              </p>
            </div>
            
            <div style="text-align: center; margin: 35px 0;">
              <a href="${payload.onboardingLink ?? "#"}" 
                 style="display: inline-block; background: #2563eb; color: #ffffff; padding: 16px 40px; 
                        border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;
                        box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2); transition: all 0.3s;">
                Complete Onboarding Now
              </a>
            </div>
            
            <div style="background: #f9fafb; padding: 15px; border-radius: 6px; margin: 25px 0;">
              <p style="font-size: 13px; color: #6b7280; margin: 0;">
                <strong>Having trouble with the button?</strong> Copy and paste this link into your browser:
              </p>
              <p style="font-size: 13px; color: #2563eb; word-break: break-all; margin: 8px 0 0 0;">
                ${payload.onboardingLink ?? "Link will be provided separately"}
              </p>
            </div>
            
            <p style="font-size: 15px; margin-top: 30px;">
              If you have any questions or need assistance during the onboarding process, please don't hesitate to reach out to our HR team.
            </p>
            
            <p style="font-size: 15px; margin-top: 25px; color: #1f2937;">
              We look forward to seeing the amazing contributions you'll make!
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
    selected: {
      subject: `🎊 Congratulations! Offer for ${position} at ${companyName}`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Congratulations! 🎉</h1>
          </div>
          
          <div style="padding: 40px 30px; color: #333; line-height: 1.8;">
            <p style="font-size: 18px; color: #1f2937; margin-bottom: 20px;">Dear ${candidateName},</p>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              We are delighted to inform you that you have been <strong style="color: #10b981;">selected</strong> for the position of <strong>${position}</strong> at <strong>${companyName}</strong>!
            </p>
            
            <p style="font-size: 16px; margin-bottom: 25px;">
              After careful consideration of all candidates, your skills, experience, and enthusiasm stood out. We believe you'll be a valuable addition to our team.
            </p>
            
            ${
              selectionDetails
                ? `
                <div style="background: #f0fdf4; border: 2px solid #10b981; padding: 25px; border-radius: 8px; margin: 30px 0;">
                  <h3 style="color: #059669; margin-top: 0; margin-bottom: 20px; font-size: 18px;">📄 Your Position Details</h3>
                  
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 12px 0; border-bottom: 1px solid #d1fae5; color: #065f46; font-weight: 600;">Position Type:</td>
                      <td style="padding: 12px 0; border-bottom: 1px solid #d1fae5; color: #1f2937;">${selectionDetails.positionType}</td>
                    </tr>
                    <tr>
                      <td style="padding: 12px 0; border-bottom: 1px solid #d1fae5; color: #065f46; font-weight: 600;">Duration:</td>
                      <td style="padding: 12px 0; border-bottom: 1px solid #d1fae5; color: #1f2937;">${selectionDetails.duration}</td>
                    </tr>
                    <tr>
                      <td style="padding: 12px 0; border-bottom: 1px solid #d1fae5; color: #065f46; font-weight: 600;">Training Period:</td>
                      <td style="padding: 12px 0; border-bottom: 1px solid #d1fae5; color: #1f2937;">${selectionDetails.trainingPeriod}</td>
                    </tr>
                    <tr>
                      <td style="padding: 12px 0; color: #065f46; font-weight: 600;">Role Description:</td>
                      <td style="padding: 12px 0; color: #1f2937;">${selectionDetails.role}</td>
                    </tr>
                  </table>
                </div>`
                : ""
            }
            
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 30px 0; border-radius: 4px;">
              <p style="margin: 0; font-size: 15px; color: #92400e;">
                <strong>⏭️ What's Next?</strong><br/>
                Our HR team will contact you within 2-3 business days with detailed information about your joining formalities, documentation requirements, and start date.
              </p>
            </div>
            
            <p style="font-size: 15px; margin-top: 25px;">
              We're excited to see the impact you'll make and look forward to having you as part of our team!
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
    rejected: {
      subject: `Application Update - ${position} at ${companyName}`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <div style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Application Update</h1>
          </div>
          
          <div style="padding: 40px 30px; color: #333; line-height: 1.8;">
            <p style="font-size: 18px; color: #1f2937; margin-bottom: 20px;">Dear ${candidateName},</p>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              Thank you for taking the time to apply for the <strong>${position}</strong> role at <strong>${companyName}</strong> and for your interest in joining our team.
            </p>
            
            <p style="font-size: 16px; margin-bottom: 25px;">
              After careful review of all applications and interviews, we regret to inform you that we have decided to move forward with other candidates whose qualifications more closely match our current requirements.
            </p>
            
            ${
              rejectionReason
                ? `
                <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 25px 0; border-radius: 4px;">
                  <p style="margin: 0; font-size: 15px; color: #7f1d1d;">
                    <strong>Feedback:</strong><br/>
                    ${rejectionReason}
                  </p>
                </div>`
                : ""
            }
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              We were impressed by your background and experience. This decision was highly competitive, and we encourage you to apply for future opportunities that align with your skills and career goals.
            </p>
            
            <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 30px 0; border-radius: 4px;">
              <p style="margin: 0; font-size: 15px; color: #1e40af;">
                <strong>💡 Stay Connected:</strong><br/>
                We'll keep your profile on file and will reach out if a suitable position becomes available. We also invite you to check our careers page regularly for new openings.
              </p>
            </div>
            
            <p style="font-size: 15px; margin-top: 25px;">
              We wish you the very best in your job search and future endeavors. Thank you once again for considering ${companyName} as your potential employer.
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
    shortlisted: {
      subject: `✨ You're Shortlisted! Next Steps for ${position} at ${companyName}`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Great News! ✨</h1>
          </div>
          
          <div style="padding: 40px 30px; color: #333; line-height: 1.8;">
            <p style="font-size: 18px; color: #1f2937; margin-bottom: 20px;">Dear ${candidateName},</p>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              We're pleased to inform you that your application for <strong>${position}</strong> at <strong>${companyName}</strong> has been <strong style="color: #8b5cf6;">shortlisted</strong>!
            </p>
            
            <p style="font-size: 16px; margin-bottom: 25px;">
              Your qualifications and experience have caught our attention, and we'd like to move forward with the next phase of our selection process.
            </p>
            
            <div style="background: #faf5ff; border: 2px solid #8b5cf6; padding: 25px; border-radius: 8px; margin: 30px 0;">
              <h3 style="color: #7c3aed; margin-top: 0; margin-bottom: 15px; font-size: 18px;">📌 Current Status</h3>
              <p style="margin: 0; font-size: 15px; color: #5b21b6; line-height: 1.6;">
                You're among the top candidates selected from a competitive pool of applications. We're currently reviewing final profiles and will be scheduling interviews shortly.
              </p>
            </div>
            
            ${
              shortlistRoles && shortlistRoles.length > 0
                ? `
                <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 25px 0; border-radius: 4px;">
                  <h3 style="color: #1e40af; margin-top: 0; margin-bottom: 15px; font-size: 16px;">🎯 Potential Role Matches</h3>
                  <p style="margin: 0 0 12px 0; font-size: 14px; color: #1f2937;">
                    Based on your profile, you may also be a great fit for:
                  </p>
                  <ul style="margin: 0; padding-left: 20px; color: #1f2937;">
                    ${shortlistRoles
                      .map(
                        (r) =>
                          `<li style="margin: 8px 0; font-size: 15px;">${r}</li>`
                      )
                      .join("")}
                  </ul>
                </div>`
                : ""
            }
            
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 30px 0; border-radius: 4px;">
              <p style="margin: 0; font-size: 15px; color: #92400e;">
                <strong>⏰ What Happens Next?</strong><br/>
                Our recruitment team will contact you within 3-5 business days with details about the next round, which may include interviews, assessments, or additional discussions.
              </p>
            </div>
            
            <p style="font-size: 15px; margin-top: 25px;">
              In the meantime, if you have any questions or need to update any information in your application, please feel free to reach out to us.
            </p>
            
            <p style="font-size: 15px; margin-top: 20px;">
              Thank you for your patience and continued interest in joining ${companyName}!
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

  return templates[status];
};



