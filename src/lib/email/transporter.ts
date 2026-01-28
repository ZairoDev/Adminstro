// Email Transporter Configuration
import nodemailer from "nodemailer";

export const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "admistro.in@gmail.com",
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
};

export const createTransporterHR = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "hr@zairointernational.com",
      pass: process.env.HR_APP_PASSWORD,
    },
  });
};

export const DEFAULT_FROM_EMAIL = "admistro.in@gmail.com";
export const DEFAULT_COMPANY_NAME = "Zairo International";



