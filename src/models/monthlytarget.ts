import mongoose from "mongoose";

const areaSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    zone: { type: String },
    transportation: {
      metroZone: { type: String }, // metro line/zone
      tram: { type: String },
      subway: { type: String },
      bus: { type: String },
    },
    price: {
      studio: { type: Number },
      sharedSpot: { type: Number }, // e.g. bed space
      sharedRoom: { type: Number }, // e.g. room in shared flat
      apartment: {
        oneBhk: { type: Number },
        twoBhk: { type: Number },
        threeBhk: { type: Number },
      },
    },
  },
  { _id: false } // avoid auto _id for subdocs
);

const targetSchema = new mongoose.Schema(
  {
    country: {
      type: String,
      required: true,
    },
    state: {
      type: String,
    },
    city: {
      type: String,
      required: true,
    },
    area: {
      type: [areaSchema], // richer schema per area
      default: [],
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
