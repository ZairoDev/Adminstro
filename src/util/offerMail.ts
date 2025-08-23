import nodemailer from "nodemailer";

import Aliases from "@/models/alias";
import { TheTechTuneTemplate } from "@/helper/EmailTemplate/email";

import { AliasInterface } from "./type";

interface OfferMailParams {
  email: string;
  emailType: "TECHTUNEOFFER";
  employeeEmail: string;
  aliasEmail: string;
  aliasEmailPassword: string;
  data?: { plan: string; [key: string]: any };
}

export const sendOfferMail = async ({
  email,
  emailType,
  employeeEmail,
  aliasEmail,
  aliasEmailPassword,
  data = { plan: "" },
}: OfferMailParams): Promise<{ success: boolean; message: string }> => {
  try {
    // Prepare email template and subject based on the type of email
    let templateContent: string;
    let subject: string;

    switch (emailType) {
      case "TECHTUNEOFFER":
        templateContent = TheTechTuneTemplate({
          plan: data.plan,
          discount: data.discount,
          effectivePrice: data.effectivePrice,
        });
        subject = "TechTune Offer";
        break;
      default:
        throw new Error("Invalid email type");
    }

    const mailOptions = {
      from: aliasEmail,
      to: email,
      subject,
      html: templateContent,
    };

    // Configure nodemailer transporter
    let transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: aliasEmail,
        pass: aliasEmailPassword,
      },
    });

    // Send the email
    const mailResponse = await transporter.sendMail(mailOptions);

    // Check if the email was rejected
    if (mailResponse.rejected.length > 0) {
      // console.log("Email rejected:", mailResponse.rejected);
      return { success: false, message: "Unable to send mail" };
    }

    // console.log("Email sent successfully");
    return { success: true, message: "Email sent successfully." };
  } catch (error: any) {
    console.error("Error sending email:", error);
    throw new Error("Failed to send email: " + error.message);
  }
};
