import mongoose, { Schema } from "mongoose";

import { VisitValidationSchema } from "@/schemas/visit.schema";
import { VISIT_OUTCOMES, VISIT_STATUSES } from "@/lib/visits/visitStatus";

const visitSchema: Schema = new Schema<VisitValidationSchema>({
  lead: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Query",
  },
  propertyId: { type: String},
  VSID: { type: String },
  ownerName: { type: String, required: true },
  ownerPhone: { type: String },
  ownerEmail: { type: String, required: true },
  schedule: [
    {
      date: { type: Date, required: true },
      time: { type: String, required: true },
      _id: false,
    },
  ],
  scheduleHistory: [
    {
      date: { type: Date, required: true },
      time: { type: String, required: true },
      changedAt: { type: Date, required: true },
      changedBy: { type: String, required: true },
      reason: { type: String },
      _id: false,
    },
  ],
  visitType: {
    type: String,
    enum: {
      values: ["physical", "virtual"],
      message: "Please select a valid visit type",
    },
  },
  agentName: { type: String, required: true },
  agentPhone: { type: String, required: true },
  pitchAmount: { type: Number, required: true },
  vsFinal:{
    type: Number,},
  ownerCommission: { type: Number, required: true },
  travellerCommission: { type: Number, required: true },
  agentCommission: { type: Number, required: true },
  documentationCharges: { type: Number, required: true },
  visitStatus: {
    type: String,
    enum: VISIT_STATUSES,
    default: "scheduled",
    required: true,
    index: true,
  },
  statusHistory: [
    {
      from: { type: String, required: true },
      to: { type: String, required: true },
      at: { type: Date, required: true },
      by: { type: String, required: true },
      source: { type: String, enum: ["manual", "auto", "system"], required: true },
      reason: { type: String },
      _id: false,
    },
  ],
  outcome: {
    type: String,
    enum: VISIT_OUTCOMES,
    default: "none",
  },
  outcomeReason: { type: String },
  rejectionReason: { type: String },
  completedAt: { type: Date },
  completedBy: { type: String },
  completionSource: { type: String, enum: ["manual", "auto", "system"] },
  reason: { type: String, required: false },
  note: { type: String, required: false },
  createdBy: { type: String, required: true },
},
{ timestamps: true });

visitSchema.index({ createdAt: -1, location: 1 });
visitSchema.index({ location: 1, createdAt: -1 });
visitSchema.index({ createdBy: 1, createdAt: -1 });
visitSchema.index({ schedule: 1, location: 1 });
visitSchema.index({ visitStatus: 1, "schedule.date": 1 });

const Visits = mongoose.models?.visits || mongoose.model("visits", visitSchema);
export default Visits;
