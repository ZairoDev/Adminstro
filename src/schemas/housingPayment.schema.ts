import { z } from "zod";

export const paymentStatusSchema = z.enum(["created", "captured", "failed"]);

export const paymentSchema = z.object({
  userId: z.string().min(1, "User id is required"),
  planId: z.string().min(1, "Plan id is required"),
  razorpayOrderId: z.string().min(1, "razorpayOrderId is required"),
  addressKey: z.string().min(1, "addressKey is required"),
  couponCode: z.string().optional(),
  razorpayPaymentId: z.string().optional(),
  razorpaySignature: z.string().optional(),
  amountEuro: z.number().min(0, "Amount must be >= 0"),
  currency: z.string().default("EUR"),
  status: paymentStatusSchema.default("created"),
  failureReason: z.string().optional(),
  verifiedAt: z.date().optional(),
  capturedAt: z.date().optional(),
  source: z.enum(["verify", "webhook"]).optional(),
});

export type PaymentValidation = z.infer<typeof paymentSchema>;

