import mongoose, { Schema, Document, Types } from "mongoose";

export interface IDepartment extends Document {
  _id: Types.ObjectId;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const departmentSchema = new Schema<IDepartment>(
  {
    name: {
      type: String,
      required: [true, "Department name is required"],
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true },
);

departmentSchema.index({ name: 1 }, { unique: true });

const Department: mongoose.Model<IDepartment> =
  (mongoose.models.Department as mongoose.Model<IDepartment> | undefined) ??
  mongoose.model<IDepartment>("Department", departmentSchema, "departments");

export default Department;
