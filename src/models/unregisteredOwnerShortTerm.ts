import mongoose from "mongoose";

const geoPointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["Point"],
      required: true,
      default: "Point",
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: (value: number[]): boolean => {
          if (value.length !== 2) {
            return false;
          }
          const [lng, lat] = value;
          const validLng = Number.isFinite(lng) && lng >= -180 && lng <= 180;
          const validLat = Number.isFinite(lat) && lat >= -90 && lat <= 90;
          return validLng && validLat;
        },
        message: "locationGeo.coordinates must be [lng, lat]",
      },
    },
  },
  { _id: false },
);

const unregisteredOwnerShortTermSchema = new mongoose.Schema(
  {
    VSID: {
      type: String,
    },
    name: {
      type: String,
    },
    phoneNumber: {
      type: String,
    },
    location: {
      type: String,
    },
    interiorStatus: {
      type: String,
      default: "unfurnished",
    },
    petStatus: {
      type: String,
      enum: ["Allowed", "Not Allowed", "None"],
      default: "None",
    },
    referenceLink: {
      type: String,
    },
    date: {
      type: Date,
    },
    price: {
      type: String,
      default: "0",
    },
    propertyType: {
      type: String,
      default: "Hotel",
    },
    area: {
      type: String,
    },
    link: {
      type: String,
    },
    address: {
      type: String,
    },
    locationGeo: {
      type: geoPointSchema,
      required: false,
    },
    remarks: {
      type: String,
    },
    availability: {
      type: String,
      default: "Available",
    },
    unavailableUntil: {
      type: Date,
      default: null,
    },
    imageUrls: {
      type: [String],
      default: [],
    },
    isVerified: {
      type: String,
      default: "None",
    },
    geoAddressVerified: {
      type: String,
      enum: ["Verified", "None"],
      default: "None",
    },
    propertyFloor: {
      type: String,
      default: "",
    },
    whatsappBlocked: {
      type: Boolean,
      default: false,
    },
    whatsappBlockReason: {
      type: String,
      default: null,
    },
    whatsappRetargetCount: {
      type: Number,
      default: 0,
    },
    whatsappLastRetargetAt: {
      type: Date,
      default: null,
    },
    whatsappLastErrorCode: {
      type: Number,
      default: null,
    },
    whatsappLastMessageAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

unregisteredOwnerShortTermSchema.index({ locationGeo: "2dsphere" }, { sparse: true });

export const unregisteredOwnerShortTerm =
  mongoose.models?.unregisteredOwnerShortTerm ||
  mongoose.model("unregisteredOwnerShortTerm", unregisteredOwnerShortTermSchema);
