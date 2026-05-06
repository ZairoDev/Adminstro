import mongoose from "mongoose";

const monthlyPerformanceTargetSchema = new mongoose.Schema(
  {
    city: {
      type: String,
      required: true,
      trim: true,
    },
    cityKey: {
      type: String,
      required: true,
      index: true,
    },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    leads: { type: Number, required: true, min: 0, default: 0 },
    visits: { type: Number, required: true, min: 0, default: 0 },
    sales: { type: Number, required: true, min: 0, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
  },
  { timestamps: true }
);

monthlyPerformanceTargetSchema.index(
  { cityKey: 1, month: 1, year: 1 },
  { unique: true }
);

export const MonthlyPerformanceTarget =
  mongoose.models.MonthlyPerformanceTarget ||
  mongoose.model("MonthlyPerformanceTarget", monthlyPerformanceTargetSchema);
