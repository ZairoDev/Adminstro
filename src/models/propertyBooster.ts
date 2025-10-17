import mongoose, { model, models } from "mongoose";
import { customAlphabet } from "nanoid";

const generateBoostID = (length: number): string => {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const generateUniqueId = customAlphabet(charset, length);
  return generateUniqueId();
};

const propertyBoosterSchema = new mongoose.Schema(
  {
     BoostID: {
      type: String,
      default: () => generateBoostID(6),
    },
    vsid: {
      type: String,

    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    ownerName: {
      type: String,
      required: true,
      trim: true,
    },
    ownerPhone: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true, 
    },
    
    location: {
      type: String,
    },
    images: [
      {
        type: String, 
        required: true,
      },
    ],
    createdBy: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export const Boosters = models.PropertyBooster || model("PropertyBooster", propertyBoosterSchema);
