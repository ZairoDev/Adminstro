import { z } from "zod";
import mongoose from "mongoose";

const bookingSchema = z.object({
  lead: z.instanceof(mongoose.Schema.Types.ObjectId),
  visit: z.instanceof(mongoose.Schema.Types.ObjectId),
  checkIn: z.object({
    date: z.date(),
    time: z.string(),
  }),
  checkOut: z.object({
    date: z.date(),
    time: z.string(),
  }),
  paymentStatus: z.string(),
  contract: z.string().optional(),
  finalAmount: z.number(),
  ownerPayment: z.object({
    finalAmount: z.number(),
    amountRecieved: z.number(),
  }),
  travellerAmount: z.object({
    finalAmount: z.number(),
    amountRecieved: z.number(),
  }),
  payment: z.object({
    orderId: z.string(),
    paymentId: z.string(),
    status: z.enum(["pending", "paid", "failed", "partial"]).default("pending"),
    remainingAmount: z.number(),
    paidAt: z.date(),
  }),
  note: z.string().optional(),
  createdBy: z.string(),
});

export type bookingValidationSchema = z.infer<typeof bookingSchema>;
