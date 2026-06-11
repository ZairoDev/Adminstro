import nodemailer from "nodemailer";
import { OwnerPropertyRegisteredTemplate } from "@/helper/EmailTemplate/ownerPropertyRegistered";

export async function sendOwnerPropertyRegisteredEmail({
  to,
  ownerName,
  propertyName,
  vsid,
  loginEmail,
  completeListingUrl = "https://www.vacationsaga.com/login",
  forgotPasswordUrl = "https://www.vacationsaga.com/forgotpassword",
}: {
  to: string;
  ownerName: string;
  propertyName: string;
  vsid: string;
  loginEmail: string;
  completeListingUrl?: string;
  forgotPasswordUrl?: string;
}): Promise<{ success: boolean; message: string }> {
  const email = String(to || "").trim();
  if (!email) {
    return { success: false, message: "Owner email is required." };
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "admistro.in@gmail.com",
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  const html = OwnerPropertyRegisteredTemplate({
    ownerName,
    propertyName,
    vsid,
    loginEmail,
    completeListingUrl,
    forgotPasswordUrl,
  });

  const mailResponse = await transporter.sendMail({
    from: "Vacation Saga <admistro.in@gmail.com>",
    to: email,
    subject: "Your property is registered — complete onboarding to go live",
    html,
  });

  if (mailResponse.rejected?.length > 0) {
    return { success: false, message: "Email was rejected by the mail server." };
  }

  return { success: true, message: "Owner registration email sent." };
}
