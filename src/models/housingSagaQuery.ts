import mongoose, { Document, Schema, Types } from "mongoose";
import {
  HOUSING_SAGA_PROPERTY_TYPES,
  type HousingSagaPropertyType,
} from "@/schemas/housingSagaQuery.schema";

export interface IHousingSagaQuery extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  phoneNo: string;
  typeOfProperty: HousingSagaPropertyType;
  country: string;
  city: string;
  location: string;
  minBudget: number;
  maxBudget: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const housingSagaQuerySchema = new Schema<IHousingSagaQuery>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
    },
    phoneNo: {
      type: String,
      required: [true, "Phone number is required"],
      index: true,
    },
    typeOfProperty: {
      type: String,
      enum: HOUSING_SAGA_PROPERTY_TYPES,
      required: [true, "Type of property is required"],
    },
    country: {
      type: String,
      required: [true, "Country is required"],
      trim: true,
    },
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
    },
    location: {
      type: String,
      required: [true, "Location is required"],
      trim: true,
    },
    minBudget: {
      type: Number,
      required: [true, "Minimum budget is required"],
      min: 0,
    },
    maxBudget: {
      type: Number,
      required: [true, "Maximum budget is required"],
      min: 0,
    },
    createdBy: {
      type: String,
      required: [true, "Creator is required"],
      lowercase: true,
      trim: true,
    },
  },
  { timestamps: true, collection: "housingsagaqueries" },
);

housingSagaQuerySchema.index({ createdBy: 1, createdAt: -1 });
housingSagaQuerySchema.index({ phoneNo: 1, createdAt: -1 });

const HousingSagaQuery =
  (mongoose.models.HousingSagaQuery as
    | mongoose.Model<IHousingSagaQuery>
    | undefined) ||
  mongoose.model<IHousingSagaQuery>("HousingSagaQuery", housingSagaQuerySchema);

export default HousingSagaQuery;
