import mongoose from "mongoose";
import type { NextRequest } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import EmailMailbox from "@/models/emailMailbox";
import {
  MAILBOX_DEFINITIONS,
  MAILBOX_KEYS,
  passwordForSmtp,
  prepareMailboxDraft,
  type MailboxKey,
} from "@/lib/email/mailbox-config";
import {
  decryptMailboxSecret,
  encryptMailboxSecret,
} from "@/lib/email/mailbox-secret";
import type { UpdateMailboxInput } from "@/lib/email/mailbox.schema";

export type PasswordSource = "database" | "environment" | "missing" | "unreadable";

export type PublicMailbox = {
  key: MailboxKey;
  label: string;
  description: string;
  loginEmail: string;
  fromEmail: string;
  connectedEmails: string[];
  passwordSource: PasswordSource;
  updatedAt: string | null;
};

export type ResolvedMailbox = {
  key: MailboxKey;
  loginEmail: string;
  fromEmail: string;
  connectedEmails: string[];
  password: string;
  passwordSource: PasswordSource;
};

type StoredMailbox = {
  key?: string;
  loginEmail?: string;
  fromEmail?: string;
  connectedEmails?: string[];
  appPasswordCipher?: string | null;
  updatedAt?: Date | string;
};

function asStoredMailbox(value: unknown): StoredMailbox | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as StoredMailbox;
}

type AuthPayload = {
  id?: string;
  role?: string;
};

async function ensureDb(): Promise<void> {
  if (mongoose.connection.readyState === 1) return;
  await connectDb();
}

function envPassword(key: MailboxKey): string {
  for (const name of MAILBOX_DEFINITIONS[key].envPasswordNames) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return "";
}

function readStoredPassword(cipher: string | null | undefined): {
  password: string;
  source: PasswordSource;
} {
  if (!cipher) {
    return { password: "", source: "missing" };
  }
  try {
    const password = decryptMailboxSecret(cipher);
    return password
      ? { password, source: "database" }
      : { password: "", source: "missing" };
  } catch {
    return { password: "", source: "unreadable" };
  }
}

export async function requireSuperAdmin(request: NextRequest): Promise<AuthPayload> {
  const payload = (await getDataFromToken(request)) as AuthPayload;
  if (String(payload.role ?? "") !== "SuperAdmin") {
    throw {
      status: 403,
      code: "FORBIDDEN",
      message: "Only a superadmin can manage email accounts",
    };
  }
  return payload;
}

export function mailboxAuthError(error: unknown): {
  status: number;
  body: { success: false; code?: string; message: string };
} {
  if (
    error &&
    typeof error === "object" &&
    "status" in error &&
    typeof (error as { status: unknown }).status === "number"
  ) {
    const e = error as { status: number; code?: string; message?: string };
    return {
      status: e.status,
      body: {
        success: false,
        code: e.code,
        message: e.message ?? "Unauthorized",
      },
    };
  }
  return {
    status: 401,
    body: { success: false, code: "UNAUTHORIZED", message: "Unauthorized" },
  };
}

async function ensureMailboxRows(): Promise<void> {
  await ensureDb();
  await Promise.all(
    MAILBOX_KEYS.map((key) => {
      const defaults = MAILBOX_DEFINITIONS[key];
      return EmailMailbox.updateOne(
        { key },
        {
          $setOnInsert: {
            key,
            loginEmail: defaults.loginEmail,
            fromEmail: defaults.fromEmail,
            connectedEmails: defaults.connectedEmails,
            appPasswordCipher: null,
            updatedBy: null,
          },
        },
        { upsert: true },
      );
    }),
  );
}

export async function listMailboxes(): Promise<PublicMailbox[]> {
  await ensureMailboxRows();
  const docs = (await EmailMailbox.find({
    key: { $in: [...MAILBOX_KEYS] },
  }).lean()) as StoredMailbox[];
  const byKey = new Map(docs.map((doc) => [String(doc.key), doc]));

  return MAILBOX_KEYS.map((key) => {
    const defaults = MAILBOX_DEFINITIONS[key];
    const doc = byKey.get(key);
    const stored = readStoredPassword(doc?.appPasswordCipher ?? null);
    const fallback = envPassword(key);
    const passwordSource: PasswordSource =
      stored.source === "database" || stored.source === "unreadable"
        ? stored.source
        : fallback
          ? "environment"
          : "missing";

    return {
      key,
      label: defaults.label,
      description: defaults.description,
      loginEmail: doc?.loginEmail || defaults.loginEmail,
      fromEmail: doc?.fromEmail || defaults.fromEmail,
      connectedEmails: doc?.connectedEmails ?? defaults.connectedEmails,
      passwordSource,
      updatedAt: doc?.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
    };
  });
}

export async function resolveMailbox(key: MailboxKey): Promise<ResolvedMailbox> {
  await ensureDb();
  const defaults = MAILBOX_DEFINITIONS[key];
  const doc = asStoredMailbox(await EmailMailbox.findOne({ key }).lean());
  const stored = readStoredPassword(doc?.appPasswordCipher ?? null);
  const fallback = stored.source === "database" ? "" : envPassword(key);
  const password = stored.source === "database" ? stored.password : fallback;
  const passwordSource: PasswordSource =
    stored.source === "database" || stored.source === "unreadable"
      ? stored.source
      : fallback
        ? "environment"
        : "missing";

  return {
    key,
    loginEmail: doc?.loginEmail || defaults.loginEmail,
    fromEmail: doc?.fromEmail || defaults.fromEmail,
    connectedEmails: doc?.connectedEmails ?? defaults.connectedEmails,
    password: passwordForSmtp(password),
    passwordSource,
  };
}

export async function updateMailbox(
  key: MailboxKey,
  input: UpdateMailboxInput,
  updatedBy: string | null,
): Promise<PublicMailbox> {
  const prepared = prepareMailboxDraft(input);
  await ensureMailboxRows();

  const existing = await EmailMailbox.findOne({ key });
  if (!existing) {
    throw new Error("Email account was not found");
  }

  existing.loginEmail = prepared.loginEmail;
  existing.fromEmail = prepared.fromEmail;
  existing.connectedEmails = prepared.connectedEmails;
  existing.updatedBy = updatedBy;

  if (input.appPassword) {
    existing.appPasswordCipher = encryptMailboxSecret(input.appPassword.trim());
  } else if (input.clearSavedPassword) {
    existing.appPasswordCipher = null;
  }

  await existing.save();
  const listed = await listMailboxes();
  const updated = listed.find((mailbox) => mailbox.key === key);
  if (!updated) throw new Error("Email account was not found");
  return updated;
}

export async function credentialsForVerify(
  key: MailboxKey,
  override?: { loginEmail?: string; appPassword?: string },
): Promise<{ user: string; pass: string }> {
  const resolved = await resolveMailbox(key);
  const user = override?.loginEmail?.trim().toLowerCase() || resolved.loginEmail;
  const pass = override?.appPassword
    ? passwordForSmtp(override.appPassword)
    : resolved.password;
  if (!user || !pass) {
    throw new Error(
      "This account has no app password yet. Save one, or keep the environment password.",
    );
  }
  return { user, pass };
}
