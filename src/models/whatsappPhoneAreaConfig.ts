import mongoose, { Schema, Document } from "mongoose";

export interface IPhoneLocationEntry {
  displayName: string;
  locationKey: string;
}

export interface IWhatsAppPhoneAreaConfig extends Document {
  phoneNumberId: string;
  locations: IPhoneLocationEntry[];
}

const phoneLocationEntrySchema = new Schema<IPhoneLocationEntry>(
  {
    displayName: { type: String, required: true, trim: true },
    locationKey: { type: String, required: true, trim: true, lowercase: true },
  },
  { _id: false }
);

const whatsAppPhoneAreaConfigSchema = new Schema<IWhatsAppPhoneAreaConfig>(
  {
    phoneNumberId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    locations: {
      type: [phoneLocationEntrySchema],
      default: [],
    },
  },
  { timestamps: true }
);

const WhatsAppPhoneAreaConfig =
  mongoose.models?.WhatsAppPhoneAreaConfig ||
  mongoose.model<IWhatsAppPhoneAreaConfig>(
    "WhatsAppPhoneAreaConfig",
    whatsAppPhoneAreaConfigSchema
  );

export default WhatsAppPhoneAreaConfig;
