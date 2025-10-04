import mongoose, { Document, Schema } from "mongoose";
import { customAlphabet } from "nanoid";
import type { PropertySchema } from "@/schemas/property.schema";

// VSID Generator Function
const generateVSID = (length: number): string => {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const generateUniqueId = customAlphabet(charset, length);
  return generateUniqueId();
};
const PropertySchema: Schema = new Schema<PropertySchema>(
  {
    VSID: {
      type: String,
      default: () => generateVSID(7),
    },
    commonId: String,
    email: {
      type: String,
      // required: true,
    },
    phone: {
      type: String,
    },
    userId: {
      type: String,
      required: true,
    },
    rentalType: {
      type: String,
      default: "Short Term",
    },
    isInstantBooking: Boolean,
    propertyType: String,
    rentalForm: String,
    propertyName: String,
    placeName: String,
    newPlaceName: String,

    street: String,
    postalCode: String,
    city: String,
    internalCity: String,
    internalArea: String,
    state: String,
    country: String,
    center: {
      type: {
        lat: Number,
        lng: Number,
      },
    },

    size: Number,
    guests: Number,
    bedrooms: Number,
    beds: Number,
    bathroom: Number,
    kitchen: Number,
    childrenAge: Number,

    basePrice: Number,
    weekendPrice: Number,
    weeklyDiscount: Number,
    pricePerDay: [[Number]],
    basePriceLongTerm: Number,
    monthlyDiscount: Number,
    currency: String,

    icalLinks: {
      type: Map,
      of: String,
    },

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

    reviews: String,
    newReviews: String,

    propertyImages: [String],
    propertyCoverFileUrl: String,
    propertyPictureUrls: [String],

    night: [Number],
    time: [Number],
    datesPerPortion: [String],

    area: String,
    subarea: String,
    neighbourhood: String,
    floor: String,
    isTopFloor: {
      type: Boolean,
      default: false,
    },
    orientation: String,
    levels: Number,
    zones: String,
    propertyStyle: String,
    constructionYear: Number,
    isSuitableForStudents: {
      type: Boolean,
      default: true,
    },
    monthlyExpenses: Number,
    heatingType: String,
    heatingMedium: String,
    energyClass: String,

    nearbyLocations: {
      type: Map,
      of: Schema.Types.Mixed,
    },

    views: Number,

    hostedFrom: String,
    hostedBy: String,
    listedOn: {
      type: [String],
      default: ["VacationSaga"],
    },
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
export const Properties =
  mongoose.models?.properties ||
  mongoose.model<PropertySchema>("properties", PropertySchema);
