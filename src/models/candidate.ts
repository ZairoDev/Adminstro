import { Schema, model, models } from "mongoose";

const CandidateSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    experience: { type: Number, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    country: { type: String, required: true },
    position: { type: String, required: true },
    coverLetter: { type: String },
    linkedin: { type: String },
    portfolio: { type: String },
    resumeUrl: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "shortlisted", "selected", "rejected"],
      default: "pending",
    },
    selectionDetails: {
      positionType: {
        type: String,
        enum: ["fulltime", "intern"],
        default: null,
      },
      duration: { type: String, default: null }, // e.g., "3 months", "6 months", "1 year"
      trainingPeriod: { type: String, default: null },
      role: { type: String, default: null },
    },
    shortlistDetails: {
      suitableRoles: [{ type: String }],
      notes: { type: String, default: null },
    },
    rejectionDetails: {
      reason: { type: String, default: null },
    },
  },
  { timestamps: true }
);

const Candidate = models.Candidate || model("Candidate", CandidateSchema);
export default Candidate;
