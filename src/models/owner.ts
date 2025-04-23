import mongoose, { Schema } from "mongoose";

const ownerSchema = new Schema(
  {
    phoneNumber: {
      type: Number,
      required: true,
    },
    propertyName: {
      type: String,
      required: true,
    },
    propertyUrl: {
      type: String,
      required: true,
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
  },
  { timestamps: true }
);

export const Owners = mongoose.models?.Owners || mongoose.model("Owners", ownerSchema);
