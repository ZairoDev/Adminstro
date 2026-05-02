import mongoose, { Schema } from "mongoose";

import { ORGANIZATIONS } from "@/util/organizationConstants";

export const SALES_EMAIL_TEMPLATE_TYPES = [
  "OFFER",
  "REM1",
  "REM2",
  "REM3",
  "REM4",
  "REBUTTAL1",
  "REBUTTAL2",
] as const;

export type SalesEmailTemplateType = (typeof SALES_EMAIL_TEMPLATE_TYPES)[number];
export const SALES_EMAIL_TEMPLATE_CATEGORIES = ["OFFER", "REMINDER", "REBUTTAL"] as const;
export type SalesEmailTemplateCategory = (typeof SALES_EMAIL_TEMPLATE_CATEGORIES)[number];

const emailTemplateSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Template name is required"],
      trim: true,
    },
    html: {
      type: String,
      required: [true, "Template HTML is required"],
    },
    subject: {
      type: String,
      default: "",
      trim: true,
    },
    displayName: {
      type: String,
      default: "",
      trim: true,
    },
    category: {
      type: String,
      enum: [...SALES_EMAIL_TEMPLATE_CATEGORIES],
      default: "OFFER",
      index: true,
    },
    sequenceOrder: {
      type: Number,
      default: null,
      index: true,
    },
    // Legacy fixed identifier retained for backward compatibility.
    type: {
      type: String,
      enum: [...SALES_EMAIL_TEMPLATE_TYPES],
      default: undefined,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    organization: {
      type: String,
      enum: [...ORGANIZATIONS],
      required: [true, "Organization is required"],
      index: true,
    },
  },
  { timestamps: true },
);

emailTemplateSchema.index({ organization: 1, category: 1, isActive: 1 });
emailTemplateSchema.index({ organization: 1, category: 1, name: 1 }, { unique: true });
emailTemplateSchema.index(
  { organization: 1, category: 1, sequenceOrder: 1 },
  {
    unique: true,
    partialFilterExpression: { category: "REMINDER", isActive: true, sequenceOrder: { $type: "number" } },
  },
);

const EmailTemplates =
  mongoose.models.EmailTemplates || mongoose.model("EmailTemplates", emailTemplateSchema);

export default EmailTemplates;

