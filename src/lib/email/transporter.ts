import nodemailer, { type Transporter } from "nodemailer";
import { MAILBOX_DEFINITIONS, type MailboxKey } from "@/lib/email/mailbox-config";
import { resolveMailbox } from "@/lib/email/mailbox.service";

export const DEFAULT_FROM_EMAIL = MAILBOX_DEFINITIONS.general.fromEmail;
export const DEFAULT_COMPANY_NAME = "Zairo International";

export type MailboxTransporter = Transporter & {
  fromEmail: string;
  hasPassword: boolean;
};

export async function openMailbox(key: MailboxKey): Promise<MailboxTransporter> {
  const mailbox = await resolveMailbox(key);
  const hasPassword =
    mailbox.password.length > 0 && mailbox.passwordSource !== "unreadable";
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: mailbox.loginEmail,
      pass: hasPassword ? mailbox.password : "",
    },
  }) as MailboxTransporter;
  transporter.fromEmail = mailbox.fromEmail;
  transporter.hasPassword = hasPassword;
  return transporter;
}

export async function createTransporter(): Promise<MailboxTransporter> {
  const transporter = await openMailbox("general");
  if (!transporter.hasPassword) {
    throw new Error(
      "General email account has no app password. A superadmin can set it under Email accounts.",
    );
  }
  return transporter;
}

export async function createTransporterHR(): Promise<MailboxTransporter> {
  const transporter = await openMailbox("hr");
  if (!transporter.hasPassword) {
    throw new Error(
      "HR email account has no app password. A superadmin can set it under Email accounts.",
    );
  }
  return transporter;
}
