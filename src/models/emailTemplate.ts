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
    type: {
      type: String,
      enum: [...SALES_EMAIL_TEMPLATE_TYPES],
      default: "OFFER",
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

emailTemplateSchema.index({ organization: 1, isActive: 1 });
emailTemplateSchema.index({ organization: 1, name: 1 }, { unique: true });
emailTemplateSchema.index(
  { organization: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: {
      type: { $in: ["REM1", "REM2", "REM3", "REM4", "REBUTTAL1", "REBUTTAL2"] },
    },
  },
);

const EmailTemplates =
  mongoose.models.EmailTemplates || mongoose.model("EmailTemplates", emailTemplateSchema);

export default EmailTemplates;

