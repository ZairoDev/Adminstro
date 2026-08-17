import { z } from "zod";

export const razorpayWebhookLogStatusSchema = z.enum([
  "received",
  "invalid_signature",
  "processed",
  "ignored",
  "error",
]);

export const razorpayWebhookLogSchema = z.object({
  event: z.string().optional(),
  signature: z.string().optional(),
  signatureVerified: z.boolean().default(false),
  headers: z.record(z.unknown()).optional(),
  payload: z.unknown().optional(),
  receivedAt: z.coerce.date(),
  processed: z.boolean().default(false),
  processedAt: z.coerce.date().optional(),
  status: razorpayWebhookLogStatusSchema.default("received"),
  error: z.string().optional(),
  retryCount: z.number().int().min(0).default(0),
  paymentId: z.string().optional(),
  paymentLinkId: z.string().optional(),
});

export type RazorpayWebhookLogValidation = z.infer<
  typeof razorpayWebhookLogSchema
>;

export const listWebhookLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  event: z.string().optional(),
  status: razorpayWebhookLogStatusSchema.optional(),
  processed: z.enum(["true", "false", "all"]).optional().default("all"),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  search: z.string().optional(),
});
