import { z } from "zod";

const emailField = z
  .string()
  .trim()
  .min(3)
  .max(320)
  .email("Enter a valid email address");

export const updateMailboxSchema = z.object({
  loginEmail: emailField,
  fromEmail: emailField,
  connectedEmails: z.array(emailField).max(20),
  appPassword: z.string().trim().min(8).max(200).optional(),
  clearSavedPassword: z.boolean().optional(),
});

export const verifyMailboxSchema = z.object({
  loginEmail: emailField.optional(),
  appPassword: z.string().trim().min(8).max(200).optional(),
});

export type UpdateMailboxInput = z.infer<typeof updateMailboxSchema>;
export type VerifyMailboxInput = z.infer<typeof verifyMailboxSchema>;
