import mongoose, { Schema, Document } from "mongoose";

export interface IRetargetContact extends Document {
  name: string;
  phoneNumber: string;
  country: string;
  uploadedBy: string;
  uploadedAt: Date;
  sourceFileName: string;
  batchId: string;
  isActive: boolean;
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
  },
  { timestamps: true }
);

retargetContactSchema.index({ phoneNumber: 1 });
retargetContactSchema.index({ batchId: 1 });
retargetContactSchema.index({ uploadedBy: 1, isActive: 1 });

const RetargetContact =
  mongoose.models?.RetargetContact ||
  mongoose.model<IRetargetContact>("RetargetContact", retargetContactSchema);

export default RetargetContact;
