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
    leadsConfigured: { type: Boolean, default: false },
    visitsConfigured: { type: Boolean, default: false },
    salesConfigured: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
  },
  { timestamps: true }
);

monthlyPerformanceTargetSchema.index(
  { cityKey: 1, month: 1, year: 1 },
  { unique: true }
);

// In development, hot-reload keeps the old compiled model in mongoose.models.
// Deleting it here forces re-compilation with the current schema on every reload,
// ensuring new fields (e.g. *Configured flags) are never silently stripped.
if (process.env.NODE_ENV !== "production") {
  delete (mongoose.models as Record<string, unknown>).MonthlyPerformanceTarget;
}

export const MonthlyPerformanceTarget =
  mongoose.models.MonthlyPerformanceTarget ||
  mongoose.model("MonthlyPerformanceTarget", monthlyPerformanceTargetSchema);
