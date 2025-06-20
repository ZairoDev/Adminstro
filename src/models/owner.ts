import mongoose, { Schema } from "mongoose";

const ownerSchema = new Schema(
  {
    phoneNumber: {
      type: Number,
      required: true,
    },
    email: {
      type: String,
    },
    propertyName: {
      type: String,
      required: true,
    },
    propertyUrl: {
      type: String,
      required: true,
    },
    propertyAlreadyAvailableOn: {
      type: [String],
      default: [],
    },
    country: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    area: {
      type: String,
      required: true,
    },
    disposition: {
      type: String,
    },
    callback: {
      type: String,
    },
    note: {
      type: String,
    },
    createdBy: {
      type: String,
    },
  },
  { timestamps: true }
);

export const Owners =
  mongoose.models?.Owners || mongoose.model("Owners", ownerSchema);
