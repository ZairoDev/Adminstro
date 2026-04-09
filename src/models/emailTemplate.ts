import mongoose, { Schema } from "mongoose";

import { ORGANIZATIONS } from "@/util/organizationConstants";

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

const EmailTemplates =
  mongoose.models.EmailTemplates || mongoose.model("EmailTemplates", emailTemplateSchema);

export default EmailTemplates;

