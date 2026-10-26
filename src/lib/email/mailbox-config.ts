export const MAILBOX_KEYS = ["general", "hr"] as const;

export type MailboxKey = (typeof MAILBOX_KEYS)[number];

export type MailboxDefinition = {
  key: MailboxKey;
  label: string;
  description: string;
  loginEmail: string;
  fromEmail: string;
  connectedEmails: string[];
  envPasswordNames: string[];
};

export const MAILBOX_DEFINITIONS: Record<MailboxKey, MailboxDefinition> = {
  general: {
    key: "general",
    label: "General",
    description:
      "Password resets, owner listings, invoices, and payment emails.",
    loginEmail: "admistro.in@gmail.com",
    fromEmail: "admistro.in@gmail.com",
    connectedEmails: ["no-reply@vacationsaga.com"],
    envPasswordNames: ["GMAIL_APP_PASSWORD", "EMAIL_PASSWORD"],
  },
  hr: {
    key: "hr",
    label: "HR",
    description: "Candidate, onboarding, and job-application emails.",
    loginEmail: "hr.zairointernational@gmail.com",
    fromEmail: "admistro.in@gmail.com",
    connectedEmails: ["admistro.in@gmail.com"],
    envPasswordNames: ["HR_APP_PASSWORD"],
  },
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isMailboxKey(value: string): value is MailboxKey {
  return (MAILBOX_KEYS as readonly string[]).includes(value);
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isEmailAddress(value: string): boolean {
  return EMAIL_PATTERN.test(value);
}

export function passwordForSmtp(value: string): string {
  return value.replace(/\s+/g, "");
}

export type PreparedMailbox = {
  loginEmail: string;
  fromEmail: string;
  connectedEmails: string[];
};

export function prepareMailboxDraft(input: {
  loginEmail: string;
  fromEmail: string;
  connectedEmails: string[];
}): PreparedMailbox {
  const loginEmail = normalizeEmail(input.loginEmail);
  if (!isEmailAddress(loginEmail)) {
    throw new Error("Account email is not a valid email address");
  }

  const connectedEmails: string[] = [];
  for (const raw of input.connectedEmails) {
    const email = normalizeEmail(raw);
    if (!email || email === loginEmail) continue;
    if (!isEmailAddress(email)) {
      throw new Error(`Connected email is not valid: ${raw}`);
    }
    if (!connectedEmails.includes(email)) connectedEmails.push(email);
  }

  const fromEmail = normalizeEmail(input.fromEmail);
  if (!isEmailAddress(fromEmail)) {
    throw new Error("From address is not a valid email address");
  }
  if (fromEmail !== loginEmail && !connectedEmails.includes(fromEmail)) {
    throw new Error(
      "From address must be the account email or one of the connected emails",
    );
  }

  return { loginEmail, fromEmail, connectedEmails };
}
