import mongoose from "mongoose";

import { HousingOwnerValidationSchema } from "@/schemas/housingowner.schema";

const housingOwnerSchema = new mongoose.Schema<HousingOwnerValidationSchema>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, default: null },
    role: {
      type: String,
      default: null,
      enum: ["owner", "buyer", "admin", null],
    },
    password: { type: String, required: true },
    profilePic: { type: String },
    isVerified: { type: Boolean, default: false },
    onboarded: { type: Boolean, default: false },
    verifyToken: String,
    verifyTokenExpiry: Date,
    subscriptionPlan: { type: String, default: null },
    subscriptionValidTill: { type: Date, default: null },
    paymentStatus: {
      type: String,
      default: null,
      enum: ["active", "inactive", null],
    },
    paidListingAddresses: {
      type: [String],
      required: false,
      default: [],
    },
  },
  { timestamps: true },
);

export const HousingUsers =
  mongoose.models.HousingUsers ||
  mongoose.model<HousingOwnerValidationSchema>("HousingUsers", housingOwnerSchema);
