import mongoose, { Schema, Document, Types } from "mongoose";

export interface IJobPosition extends Document {
  _id: Types.ObjectId;
  name: string;
  departmentId: Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const jobPositionSchema = new Schema<IJobPosition>(
  {
    name: {
      type: String,
      required: [true, "Job position name is required"],
      trim: true,
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true },
);

jobPositionSchema.index({ departmentId: 1, name: 1 }, { unique: true });

const JobPosition: mongoose.Model<IJobPosition> =
  (mongoose.models.JobPosition as mongoose.Model<IJobPosition> | undefined) ??
  mongoose.model<IJobPosition>("JobPosition", jobPositionSchema, "jobpositions");

export default JobPosition;
