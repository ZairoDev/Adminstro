import { z } from "zod";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_STATUSES,
  RECURRING_FREQUENCIES,
  compareMonthKeys,
} from "@/modules/finance/expense-sheet";

const MAX_AMOUNT = 1_000_000_000;

const monthKey = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use a month like 2026-11");
const amount = z.number().finite().min(0).max(MAX_AMOUNT);
const title = z.string().trim().min(1, "Enter a name").max(120);
const vendor = z.string().trim().max(120);
const notes = z.string().trim().max(500);
const category = z.enum(EXPENSE_CATEGORIES);
const status = z.enum(EXPENSE_STATUSES);
const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date like 2026-11-26")
  .refine((value) => !Number.isNaN(new Date(`${value}T00:00:00+05:30`).getTime()), "Enter a real date");

const invoiceUrl = z
  .string()
  .trim()
  .max(500)
  .refine((value) => value.startsWith("https://"), "Upload the invoice before marking this paid");
const invoiceName = z.string().trim().min(1, "The invoice needs a file name").max(180);

function paidNeedsInvoice(value: { status?: "pending" | "paid"; invoiceUrl?: string; invoiceName?: string }): boolean {
  if (value.status !== "paid") return true;
  return Boolean(value.invoiceUrl && value.invoiceName);
}

export const expenseSheetQuerySchema = z.object({
  month: monthKey.optional(),
});

export type ExpenseSheetQuery = z.infer<typeof expenseSheetQuerySchema>;

export const createExpenseBodySchema = z.object({
  month: monthKey,
  title,
  category,
  vendor: vendor.optional().default(""),
  notes: notes.optional().default(""),
  amount,
  status: status.optional().default("pending"),
  paidOn: dateOnly.nullable().optional(),
  invoiceUrl: invoiceUrl.optional(),
  invoiceName: invoiceName.optional(),
}).refine(paidNeedsInvoice, {
  message: "Upload the invoice before marking this paid",
  path: ["invoiceUrl"],
});

export type CreateExpenseBody = z.infer<typeof createExpenseBodySchema>;

export const updateExpenseBodySchema = z
  .object({
    title: title.optional(),
    category: category.optional(),
    vendor: vendor.optional(),
    notes: notes.optional(),
    amount: amount.optional(),
    status: status.optional(),
    paidOn: dateOnly.nullable().optional(),
    invoiceUrl: invoiceUrl.optional(),
    invoiceName: invoiceName.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "Nothing to update")
  .refine(paidNeedsInvoice, {
    message: "Upload the invoice before marking this paid",
    path: ["invoiceUrl"],
  });

export type UpdateExpenseBody = z.infer<typeof updateExpenseBodySchema>;

export const createRecurringExpenseBodySchema = z
  .object({
    title,
    category,
    vendor: vendor.optional().default(""),
    notes: notes.optional().default(""),
    frequency: z.enum(RECURRING_FREQUENCIES),
    startMonth: monthKey,
    endMonth: monthKey.nullable().optional().default(null),
    amount,
  })
  .refine(
    (value) => value.endMonth === null || compareMonthKeys(value.endMonth, value.startMonth) >= 0,
    { message: "The end month cannot be before the start month", path: ["endMonth"] },
  );

export type CreateRecurringExpenseBody = z.infer<typeof createRecurringExpenseBodySchema>;

export const updateRecurringExpenseBodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("details"),
    title: title.optional(),
    category: category.optional(),
    vendor: vendor.optional(),
    notes: notes.optional(),
    frequency: z.enum(RECURRING_FREQUENCIES).optional(),
  }),
  z.object({
    action: z.literal("amount"),
    /** First month the new amount applies to. */
    fromMonth: monthKey,
    amount,
  }),
  z.object({
    action: z.literal("stop"),
    /** Last month this expense still applies to. */
    lastMonth: monthKey,
  }),
]).refine(
  (value) => value.action !== "details" || Object.keys(value).some((key) => key !== "action"),
  "Nothing to update",
);

export type UpdateRecurringExpenseBody = z.infer<typeof updateRecurringExpenseBodySchema>;

export const recurringMonthBodySchema = z
  .object({
    skipped: z.boolean().optional(),
    amountOverride: amount.nullable().optional(),
    status: status.optional(),
    paidOn: dateOnly.nullable().optional(),
    invoiceUrl: invoiceUrl.optional(),
    invoiceName: invoiceName.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "Nothing to update")
  .refine(paidNeedsInvoice, {
    message: "Upload the invoice before marking this paid",
    path: ["invoiceUrl"],
  });

export type RecurringMonthBody = z.infer<typeof recurringMonthBodySchema>;

export const copyPreviousBodySchema = z.object({
  month: monthKey,
});

export type CopyPreviousBody = z.infer<typeof copyPreviousBodySchema>;

export const monthParamSchema = monthKey;
