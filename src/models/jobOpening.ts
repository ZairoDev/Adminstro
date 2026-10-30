import mongoose, { Schema, Document, Types } from "mongoose";

export interface IJobOpening extends Document {
  _id: Types.ObjectId;
  title: string;
  slug: string;
  departmentId: Types.ObjectId;
  jobPositionId: Types.ObjectId;
  summary: string;
  description: string;
  responsibilities: string;
  requirements: string;
  location: string;
  employmentType: "fulltime" | "intern" | null;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const jobOpeningSchema = new Schema<IJobOpening>(
  {
    title: {
      type: String,
      required: [true, "Job title is required"],
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: true,
      index: true,
    },
    jobPositionId: {
      type: Schema.Types.ObjectId,
      ref: "JobPosition",
      required: true,
      index: true,
    },
    summary: {
      type: String,
      required: [true, "A short summary is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Job description is required"],
      trim: true,
    },
    responsibilities: {
      type: String,
      default: "",
      trim: true,
    },
    requirements: {
      type: String,
      default: "",
      trim: true,
    },
    location: {
      type: String,
      default: "",
      trim: true,
    },
    employmentType: {
      type: String,
      enum: ["fulltime", "intern", null],
      default: null,
    },
    isPublished: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true },
);

const JobOpening: mongoose.Model<IJobOpening> =
  (mongoose.models.JobOpening as mongoose.Model<IJobOpening> | undefined) ??
  mongoose.model<IJobOpening>("JobOpening", jobOpeningSchema, "jobopenings");

export default JobOpening;
