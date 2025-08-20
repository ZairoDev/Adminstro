import mongoose from "mongoose";

const target = new mongoose.Schema(
  {
    country: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    area:{type:[String]},
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
  mongoose.models.MonthlyTarget || mongoose.model("MonthlyTarget", target);
