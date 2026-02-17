import mongoose, { Schema, Document } from "mongoose";

export interface IRetargetContact extends Document {
  name: string;
  phoneNumber: string;
  country: string;
  countryCode?: string;
  uploadedBy: string;
  uploadedAt: Date;
  sourceFileName: string;
  batchId: string;
  isActive: boolean;
  role?: "owner" | "guest";
  // Retarget tracking fields
  state: "pending" | "retargeted" | "blocked";
  retargetCount: number;
  lastRetargetAt?: Date | null;
  lastErrorCode?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

const retargetContactSchema = new Schema<IRetargetContact>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
    },
    phoneNumber: {
      type: String,
      required: [true, "Phone number is required"],
    },
    country: {
      type: String,
      required: [true, "Country is required"],
    },
    countryCode: {
      type: String,
      required: false,
      default: undefined,
    },
    uploadedBy: {
      type: String,
      required: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    sourceFileName: {
      type: String,
      required: true,
    },
    batchId: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Role: optional field to mark owner/guest for contacts (not set by default)
    role: {
      type: String,
      enum: ["owner", "guest"],
      required: false,
      index: true,
    },
    // Retargeting state & tracking
    state: {
      type: String,
      enum: ["pending", "retargeted", "blocked"],
      default: "pending",
    },
    retargetCount: {
      type: Number,
      default: 0,
    },
    lastRetargetAt: {
      type: Date,
      default: null,
    },
    lastErrorCode: {
      type: Number,
      required: false,
      default: undefined,
    },
  },
  { timestamps: true }
);

retargetContactSchema.index({ phoneNumber: 1 });
retargetContactSchema.index({ batchId: 1 });
retargetContactSchema.index({ uploadedBy: 1, isActive: 1 });
retargetContactSchema.index({ countryCode: 1 });
retargetContactSchema.index({ state: 1 });

const RetargetContact =
  mongoose.models?.RetargetContact ||
  mongoose.model<IRetargetContact>("RetargetContact", retargetContactSchema);

export default RetargetContact;
