import { z } from "zod";
import mongoose from "mongoose";

const VisitSchema = z.object({
  lead: z.instanceof(mongoose.Schema.Types.ObjectId),
  propertyId: z.string(),
  VSID: z.string(),
  ownerName: z.string(),
  ownerPhone: z.string(),
  ownerEmail: z.string(),
  propertyDesc: z.string(),
  schedule: z.array(
    z.object({
      date: z.date(),
      time: z.string(),
    })
  ),
  visitType: z.enum(["physical", "virtual"]),
  agentName: z.string(),
  agentPhone: z.string(),
  pitchAmount: z.number(),
  vsFinal: z.number(),
  // commission: z.number(),
  ownerCommission: z.number(),
  travellerCommission: z.number(),
  agentCommission: z.number(),
  rejectionReason: z.string().optional(),
  documentationCharges: z.number(),
  visitStatus: z.string(),
  reason: z.string(),
  note: z.string(),
  createdBy: z.string(),
});

export type VisitValidationSchema = z.infer<typeof VisitSchema>;
