// Email Transporter Configuration
import nodemailer from "nodemailer";

export const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "zairo.domain@gmail.com",
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
};

export const createTransporterHR = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "hr@zairointernational.com",
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
};

export const DEFAULT_FROM_EMAIL = "zairo.domain@gmail.com";
export const DEFAULT_COMPANY_NAME = "Zairo International";



