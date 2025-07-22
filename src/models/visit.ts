import mongoose, { Schema } from "mongoose";

import { VisitValidationSchema } from "@/schemas/visit.schema";

const visitSchema: Schema = new Schema<VisitValidationSchema>({
  lead: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "query",
  },
  propertyId: { type: String, required: true },
  VSID: { type: String, required: true },
  ownerName: { type: String, required: true },
  ownerPhone: { type: String, required: true },
  ownerEmail: { type: String, required: true },
  schedule: [
    {
      date: { type: String, required: true },
      time: { type: String, required: true },
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
  commission: { type: Number, required: true },
  agentCommission: { type: Number, required: true },
  documentationCharges: { type: Number, required: true },
  visitStatus: { type: String, required: true, default: "scheduled" },
  reason: { type: String, required: false },
  note: { type: String, required: false },
  createdBy: { type: String, required: true },
});

const Visits = mongoose.models?.visits || mongoose.model("visits", visitSchema);
export default Visits;
