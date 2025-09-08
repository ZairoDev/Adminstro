import mongoose, { Schema, Document } from "mongoose";

export interface IArea extends Document {
  city: string;
  name: string;
  zone?: string;
  subUrban?: boolean;
  town?: boolean;
  village?: boolean;
  municipality?: boolean;
  district?: boolean;   
  districtOf?: string;     

  // transportation
  metroZone?: string;
  extension?: boolean;
  tram?: boolean;
  subway?: boolean;

  // price
  studio?: number;
  sharedApartment?: number;
  oneBhk?: number;
  twoBhk?: number;
  threeBhk?: number;
}

export const AreaSchema = new Schema<IArea>(
  {
    city: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    zone: { type: String, default: "" },
    subUrban: { type: Boolean, default: false },
    town: { type: Boolean, default: false },
    village: { type: Boolean, default: false },
    municipality: { type: Boolean, default: false },
    district: { type: Boolean, default: false },
    districtOf: { type: String, default: "" },

    // transportation (flattened)
    metroZone: { type: String, default: "" },
    extension: { type: Boolean, default: false },
    tram: { type: Boolean, default: false },
    subway: { type: Boolean, default: false },

    // price (flattened)
    studio: { type: Number, default: 0 },
    sharedApartment: { type: Number, default: 0 },
    oneBhk: { type: Number, default: 0 },
    twoBhk: { type: Number, default: 0 },
    threeBhk: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Area =
  mongoose.models?.Area || mongoose.model<IArea>("Area", AreaSchema);