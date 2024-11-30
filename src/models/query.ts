import { Schema, models, model } from "mongoose";

const querySchema = new Schema(
  {
    createdBy: {
      type: String,
      required: [false],
    },
    duration: {
      type: String,
      require: [true, "Duration is Required"],
    },
    name: {
      type: String,
      require: [true, "Name must be provided"],
    },
    email: {
      type: String,
      require: [true, "Email must be provided"],
    },
    phoneNo: {
      type: Number,
      require: [true, "Phone number must be provided"],
    },
    area: {
      type: String,
      require: [true, "Area must be provided"],
    },
    guest: {
      type: Number,
      require: [true, "Guest number should be provided"],
    },
    startDate: {
      type: String,
      require: [true, "Start Date is required"],
    },
    endDate: {
      type: String,
      require: [true, "End date is required"],
    },
    budget: {
      type: String,
      require: [true, "Budget shoule be provided"],
    },
    noOfBeds: {
      type: Number,
      require: [true, "Count of beds shoule be provided"],
    },
    location: {
      type: String,
      require: [true, "Location shoule be provided"],
    },
    bookingTerm: {
      type: String,
      enum: ["Short Term", "Long Term", "Mid Term"],
      require: [true, "bookingTerm shoule be provided"],
    },
    zone: {
      type: String,
      enum: ["North", "South", "East", "West", "Centre", "Anywhere"],
      require: [true, "Zone shoule be provided"],
    },
    billStatus: {
      type: String,
      enum: ["With Bill", "Without Bill"],
    },
    leadQualityByReviwer: {
      type: String,
      enum: ["Good", "Very Good", "Average", "Below Average"],
      default: null,
    },
    leadQualityByCreator: {
      type: String,
      enum: ["Good", "Very Good", "Average", "Below Average"],
    },
    rejectionReason: {
      type: String,
      enum: [
        "Late Response",
        "Delayed the Traveling",
        "Allready got it",
        "Didn't like the option",
        "Low Budget",
        "Number of people exceeded",
        "Off Location",
        "Blocked on whatsapp",
        "Not on whatsapp",
        "Not Replying",
      ],
      default: null,
    },
    typeOfProperty: {
      type: String,
      enum: [
        "Studio",
        "Apartment",
        "Villa",
        "Pent House",
        "Detached House",
        "Loft",
        "Shared Apartment",
        "Maisotte",
        "Studio / 1 bedroom",
      ],
    },
    propertyType: {
      type: String,
      enum: ["Furnished", "Un - furnished", "Semi-furnished"],
      require: [true, "Property type must be provided"],
    },
    priority: {
      type: String,
      enum: ["High", "Low", "Medium"],
      require: [true, "Priority must be provided"],
    },
  },
  { timestamps: true }
);

const Query = models.Query || model("Query", querySchema);
export default Query;
