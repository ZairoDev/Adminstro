import { Schema, model, models, type Document, type Model } from "mongoose";

import { ORGANIZATIONS, type Organization } from "@/util/organizationConstants";

export type CompanyPlan = {
  planName: string;
  duration: string;
  price: number;
  currency: string;
  isActive: boolean;
};

export type CompanyDocument = Document & {
  name: string;
  email: string;
  phone: string;
  address: string;
  description: string;
  logo: string;
  organization?: Organization;
  content: Record<string, unknown>;
  plans: CompanyPlan[];
};

const companyPlanSchema = new Schema<CompanyPlan>(
  {
    planName: { type: String, required: true, trim: true },
    duration: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, trim: true, default: "EUR" },
    isActive: { type: Boolean, default: true },
  },
  { _id: false },
);

const companySchema = new Schema<CompanyDocument>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    description: { type: String, required: true },
    logo: { type: String, required: true },
    organization: {
      type: String,
      enum: [...ORGANIZATIONS],
      required: false,
      index: true,
    },
    content: {
      type: Schema.Types.Mixed,
      required: true,
    },
    plans: {
      type: [companyPlanSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

companySchema.index({ organization: 1, name: 1 });

const Company =
  (models.Company as Model<CompanyDocument> | undefined) ||
  model<CompanyDocument>("Company", companySchema);
export default Company;
