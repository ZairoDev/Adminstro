// import nodemailer from "nodemailer";
// import Users from "@/models/user";
// import bcryptjs from "bcryptjs";
// import {
//   ResetPasswordTemplate,
//   VerificationTemplate,
// } from "@/helper/EmailTemplate/email";
// import Employees from "@/models/employee";

// interface SendEmailParams {
//   email: string;
//   emailType: "VERIFY" | "RESET" | "OTP";
//   userId: string;
//   password?: string;
// }

// export const sendEmail = async ({
//   email,
//   emailType,
//   userId,
//   password,
// }: SendEmailParams): Promise<{ success: boolean; message: string }> => {
//   let otp: number | null = null;

//   try {
//     console.log("inside sendEmail");
//     const hashedToken = await bcryptjs.hash(userId.toString(), 10);
//     const encodedToken = encodeURIComponent(hashedToken);

//     // Update user record in DB based on email type
//     if (emailType === "VERIFY") {
//       await Employees.findByIdAndUpdate(userId, {
//         $set: {
//           verifyToken: hashedToken,
//           verifyTokenExpiry: new Date(Date.now() + 3600000), // 1 hour
//         },
//       });
//     } else if (emailType === "RESET") {
//       await Employees.findByIdAndUpdate(userId, {
//         $set: {
//           forgotPasswordToken: hashedToken,
//           forgotPasswordTokenExpiry: new Date(Date.now() + 900000), // 15 mins
//         },
//       });
//     } else if (emailType === "OTP") {
//       otp = Math.floor(100000 + Math.random() * 900000); // Generate 6-digit OTP
//       await Employees.findByIdAndUpdate(userId, {
//         $set: {
//           otpToken: otp,
//           otpTokenExpiry: new Date(Date.now() + 300000), // 5 mins
//         },
//       });
//     }

//     // Configure nodemailer transporter
//     let transporter = nodemailer.createTransport({
//       service: "gmail",
//       auth: {
//         user: "no-reply@vacationsaga.com",
//         pass: process.env.GMAIL_APP_PASSWORD,
//       },
//     });

//     // Prepare email template based on the type of email
//     let templateContent: string;
//     if (emailType === "VERIFY") {
//       templateContent = VerificationTemplate(
//         encodedToken,
//         password || "",
//         email
//       );
//     } else if (emailType === "RESET") {
//       templateContent = ResetPasswordTemplate(encodedToken);
//     } else {
//       templateContent = `<p>Your OTP is ${otp}</p>`;
//     }

//     const mailOptions = {
//       from: "No Reply <no-reply@vacationsaga.com>",
//       to: email,
//       subject:
//         emailType === "VERIFY"
//           ? "Verify your email"
//           : emailType === "RESET"
//           ? "Reset Password"
//           : "SuperAdmin Login OTP",
//       html: emailType !== "OTP" ? templateContent : `<p>${otp}</p>`,
//     };

//     // Send the email
//     const mailResponse = await transporter.sendMail(mailOptions);

//     // Check if the email was rejected
//     if (mailResponse.rejected.length > 0) {
//       console.log("Email rejected:", mailResponse.rejected);
//       return { success: false, message: "Email does not exist." };
//     }

//     console.log("Email sent successfully:", mailResponse);
//     return { success: true, message: "Email sent successfully." };
//   } catch (error: any) {
//     console.error("Error sending email:", error);
//     throw new Error("Failed to send email: " + error.message);
//   }
// };

import nodemailer from "nodemailer";
import Employees from "@/models/employee";
import bcryptjs from "bcryptjs";
import {
  NewPasswordTemplate,
  OtpTemplate,
  ResetPasswordTemplate,
  VerificationTemplate,
} from "@/helper/EmailTemplate/email";

interface SendEmailParams {
  email: string;
  emailType: "VERIFY" | "RESET" | "OTP" | "NEWPASSWORD";
  userId: string;
  password?: string;
  newPassword?: string;
  otp?: number;
}

export const sendEmail = async ({
  email,
  emailType,
  userId,
  password,
  newPassword,
}: SendEmailParams): Promise<{ success: boolean; message: string }> => {
  let otp: number | null = null;

  try {
    console.log("inside sendEmail");
    const hashedToken = await bcryptjs.hash(userId.toString(), 10);
    const encodedToken = encodeURIComponent(hashedToken);

    // Update user record in DB based on email type
    switch (emailType) {
      case "VERIFY":
        await Employees.findByIdAndUpdate(userId, {
          $set: {
            verifyToken: hashedToken,
            verifyTokenExpiry: new Date(Date.now() + 3600000), // 1 hour
          },
        });
        break;
      case "RESET":
        await Employees.findByIdAndUpdate(userId, {
          $set: {
            forgotPasswordToken: hashedToken,
            forgotPasswordTokenExpiry: new Date(Date.now() + 900000), // 15 minutes
          },
        });
        break;
      case "OTP":
        otp = Math.floor(100000 + Math.random() * 900000); // 6-digit OTP
        await Employees.findByIdAndUpdate(userId, {
          $set: {
            otpToken: otp,
            otpTokenExpiry: new Date(Date.now() + 300000), // 5 minutes
          },
        });
        break;
      case "NEWPASSWORD":
        // No need to update the database here, as it should be done in the password generation API
        break;
    }

    // Configure nodemailer transporter
    let transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "no-reply@vacationsaga.com",
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    // Prepare email template and subject based on the type of email
    let templateContent: string;
    let subject: string;

    switch (emailType) {
      case "VERIFY":
        templateContent = VerificationTemplate(
          encodedToken,
          password || "",
          email
        );
        subject = "Verify your email";
        break;
      case "RESET":
        templateContent = ResetPasswordTemplate(encodedToken);
        subject = "Reset Password";
        break;
      case "NEWPASSWORD":
        if (!newPassword) {
          throw new Error(
            "New password is required for NEWPASSWORD email type"
          );
        }
        templateContent = NewPasswordTemplate(newPassword);
        subject = "Your New Password";
        break;
      case "OTP":
        templateContent = OtpTemplate(otp ?? 0);
        subject = "SuperAdmin Login OTP";
        break;
      default:
        throw new Error("Invalid email type");
    }
    const mailOptions = {
      from: "No Reply <no-reply@vacationsaga.com>",
      to: email,
      subject,
      html: templateContent,
    };

    // Send the email
    const mailResponse = await transporter.sendMail(mailOptions);

    // Check if the email was rejected
    if (mailResponse.rejected.length > 0) {
      console.log("Email rejected:", mailResponse.rejected);
      return { success: false, message: "Email does not exist." };
    }

    console.log("Email sent successfully:", mailResponse);
    return { success: true, message: "Email sent successfully." };
  } catch (error: any) {
    console.error("Error sending email:", error);
    throw new Error("Failed to send email: " + error.message);
  }
};
