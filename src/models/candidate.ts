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
      enum: ["pending", "shortlisted", "selected", "rejected", "onboarding"],
      default: "pending",
    },
    selectionDetails: {
      positionType: {
        type: String,
        enum: ["fulltime", "intern"],
        default: null,
      },
      duration: { type: String, default: null },
      trainingPeriod: { type: String, default: null },
      role: { type: String, default: null },
      salary: { type: String, default: null },
    },
    shortlistDetails: {
      suitableRoles: [{ type: String }],
      notes: { type: String, default: null },
    },
    rejectionDetails: {
      reason: { type: String, default: null },
    },
    onboardingDetails: {
      onboardingLink: { type: String, default: null },
      personalDetails: {
        dateOfBirth: { type: String, default: null },
        gender: { type: String, default: null },
        nationality: { type: String, default: null },
        fatherName: { type: String, required: true },
      },
      bankDetails: {
        accountHolderName: { type: String, default: null },
        accountNumber: { type: String, default: null },
        ifscCode: { type: String, default: null },
        bankName: { type: String, default: null },
      },
      documents: {
        aadharCard: { type: String, default: null },
        panCard: { type: String, default: null },
        highSchoolMarksheet: { type: String, default: null },
        interMarksheet: { type: String, default: null },
        graduationMarksheet: { type: String, default: null },
        experienceLetter: { type: String, default: null },
        relievingLetter: { type: String, default: null },
        salarySlips: [{ type: String }],
      },
      eSign: {
        signatureImage: { type: String, default: null },
        signedAt: { type: Date, default: null },
      },
      termsAccepted: { type: Boolean, default: false },
      termsAcceptedAt: { type: Date, default: null },
      onboardingComplete: { type: Boolean, default: false },
      completedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

const Candidate = models.Candidate || model("Candidate", CandidateSchema);
export default Candidate;
