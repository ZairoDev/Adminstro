import mongoose, { Document, Schema } from 'mongoose';
import { customAlphabet } from 'nanoid';

// VSID Generator Function
const generateVSID = (length: number): string => {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const generateUniqueId = customAlphabet(charset, length);
  return generateUniqueId();
};

// Define Property Interface for TypeScript
export interface IProperty extends Document {
  VSID: string;
  email: string;
  rentalType: string;
  userId: string;
  propertyType?: string;
  placeName?: string;
  rentalForm?: string;
  numberOfPortions: number;
  street?: string;
  postalCode?: string;
  city?: string;
  state?: string;
  country?: string;
  center?: {
    lat: number;
    lng: number;
  };
  portionName?: string[];
  portionSize?: number[];
  guests?: number[];
  bedrooms?: number[];
  beds?: number[];
  bathroom?: number[];
  kitchen?: number[];
  childrenAge?: number[];
  basePrice?: number[];
  weekendPrice?: number[];
  monthlyDiscount?: number[];
  currency?: string;
  generalAmenities?: Map<string, boolean>;
  otherAmenities?: Map<string, boolean>;
  safeAmenities?: Map<string, boolean>;
  smoking?: string;
  pet?: string;
  party?: string;
  cooking?: string;
  additionalRules?: string[];
  reviews?: string[];
  propertyCoverFileUrl?: string;
  propertyPictureUrls?: string[];
  portionCoverFileUrls?: string[];
  portionPictureUrls?: string[][];
  night?: number[];
  time?: number[];
  datesPerPortion?: string[][];
  hostedFrom?: string;
  lastUpdatedBy: string[];
  lastUpdates: string[][];
  isLive: boolean;
}

// Property Schema Definition
const PropertySchema: Schema = new Schema<IProperty>(
  {
    VSID: {
      type: String,
      default: () => generateVSID(7),
    },
    email: {
      type: String,
      required: true,
    },
    rentalType: {
      type: String,
      default: 'Short Term',
    },
    userId: {
      type: String,
      required: true,
    },
    propertyType: String,
    placeName: String,
    rentalForm: String,
    numberOfPortions: {
      type: Number,
      default: 1,
    },
    street: String,
    postalCode: String,
    city: String,
    state: String,
    country: String,
    center: {
      type: {
        lat: Number,
        lng: Number,
      },
    },
    portionName: [String],
    portionSize: [Number],
    guests: [Number],
    bedrooms: [Number],
    beds: [Number],
    bathroom: [Number],
    kitchen: [Number],
    childrenAge: [Number],
    basePrice: [Number],
    weekendPrice: [Number],
    monthlyDiscount: [Number],
    currency: String,
    generalAmenities: {
      type: Map,
      of: Boolean,
    },
    otherAmenities: {
      type: Map,
      of: Boolean,
    },
    safeAmenities: {
      type: Map,
      of: Boolean,
    },
    smoking: String,
    pet: String,
    party: String,
    cooking: String,
    additionalRules: [String],
    reviews: [String],
    propertyCoverFileUrl: String,
    propertyPictureUrls: [String],
    portionCoverFileUrls: [String],
    portionPictureUrls: [[String]],
    night: [Number],
    time: [Number],
    datesPerPortion: [[String]],
    hostedFrom: String,
    lastUpdatedBy: {
      type: [String],
      default: [],
    },
    lastUpdates: {
      type: [[String]],
      default: [[]],
    },
    isLive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Property Model Export
export const Property =
  mongoose.models?.listings || mongoose.model<IProperty>('listings', PropertySchema);
