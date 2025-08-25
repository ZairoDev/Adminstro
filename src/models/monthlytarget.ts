import mongoose from "mongoose";

const areaSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    metrolane: { type: String },
    zone: { type: String },
  },
  { _id: false } // prevent auto _id for each subdocument
);

const targetSchema = new mongoose.Schema(
  {
    country: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    area: {
      type: [areaSchema], // 👈 array of objects, not strings
      default: [],
    },
    state: {
      type: String,
    },
    leads: { type: Number, required: true },
    visits: { type: Number, required: true },
    sales: { type: Number, required: true },
  },
  { timestamps: true }
);

export const MonthlyTarget =
  mongoose.models.MonthlyTarget ||
  mongoose.model("MonthlyTarget", targetSchema);
