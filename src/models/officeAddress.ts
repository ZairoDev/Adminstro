import mongoose, { Schema, Document, Types } from "mongoose";

export interface IOfficeAddress extends Document {
  _id: Types.ObjectId;
  name: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
  formattedAddress: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function formatOfficeAddress(parts: {
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  pincode: string;
  country?: string;
}): string {
  const line1 = String(parts.addressLine1 || "").trim();
  const line2 = String(parts.addressLine2 || "").trim();
  const city = String(parts.city || "").trim();
  const state = String(parts.state || "").trim();
  const pincode = String(parts.pincode || "").trim();
  const country = String(parts.country || "India").trim();

  const locality = [city, state, pincode].filter(Boolean).join(", ");
  return [line1, line2, locality, country].filter(Boolean).join(", ");
}

const officeAddressSchema = new Schema<IOfficeAddress>(
  {
    name: {
      type: String,
      required: [true, "Office name is required"],
      trim: true,
      unique: true,
    },
    addressLine1: {
      type: String,
      required: [true, "Address line 1 is required"],
      trim: true,
    },
    addressLine2: {
      type: String,
      trim: true,
      default: null,
    },
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
    },
    state: {
      type: String,
      required: [true, "State is required"],
      trim: true,
    },
    pincode: {
      type: String,
      required: [true, "Pincode is required"],
      trim: true,
    },
    country: {
      type: String,
      trim: true,
      default: "India",
    },
    formattedAddress: {
      type: String,
      required: true,
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

officeAddressSchema.pre("validate", function (next) {
  this.formattedAddress = formatOfficeAddress({
    addressLine1: this.addressLine1,
    addressLine2: this.addressLine2,
    city: this.city,
    state: this.state,
    pincode: this.pincode,
    country: this.country,
  });
  next();
});

const OfficeAddress =
  mongoose.models?.OfficeAddress ||
  mongoose.model<IOfficeAddress>("OfficeAddress", officeAddressSchema);

export default OfficeAddress;
