import mongoose, { Schema, type InferSchemaType } from "mongoose";

const companyHolidaySchema = new Schema(
  {
    date: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    departmentId: { type: String, default: null },
  },
  { timestamps: true },
);

companyHolidaySchema.index({ date: 1, departmentId: 1 }, { unique: true });

export type CompanyHolidayDoc = InferSchemaType<typeof companyHolidaySchema> & {
  _id: mongoose.Types.ObjectId;
};

const CompanyHoliday =
  (mongoose.models.CompanyHoliday as mongoose.Model<CompanyHolidayDoc> | undefined) ??
  mongoose.model<CompanyHolidayDoc>("CompanyHoliday", companyHolidaySchema, "companyHolidays");

export default CompanyHoliday;
