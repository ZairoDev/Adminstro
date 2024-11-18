// import { QuicklistingSchema } from "@/schemas/quicklisting.schema";
import { QuicklistingValidationSchema } from "@/schemas/quicklisting.schema";
import mongoose, { Document, Schema } from "mongoose";

const QuicklistingSchema: Schema = new Schema<QuicklistingValidationSchema>(
  {
    ownerName: { type: String, required: true },
    ownerMobile: { type: String, required: true },
    propertyName: { type: String, required: true },
    propertyImages: { type: [String], default: [] },
    description: { type: String, required: true },
    basePrice: { type: Number, required: true },
    address: { type: String, required: true },
  },
  { timestamps: true }
);

// Property Model Export
export const quicklisting =
  mongoose.models?.quicklisting ||
  mongoose.model<QuicklistingValidationSchema>(
    "quicklisting",
    QuicklistingSchema
  );
