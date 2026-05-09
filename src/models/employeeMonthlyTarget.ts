import mongoose from "mongoose";

const employeeMonthlyTargetSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employees",
      required: true,
    },
    employeeName: { type: String, required: true, trim: true },
    employeeRole: { type: String, required: true },
    city: { type: String, required: true, trim: true },
    cityKey: { type: String, required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    leads: { type: Number, default: 0, min: 0 },
    visits: { type: Number, default: 0, min: 0 },
    sales: { type: Number, default: 0, min: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employees" },
  },
  { timestamps: true }
);

// One record per employee per city per month
employeeMonthlyTargetSchema.index(
  { employeeId: 1, cityKey: 1, month: 1, year: 1 },
  { unique: true }
);

if (process.env.NODE_ENV !== "production") {
  delete (mongoose.models as Record<string, unknown>).EmployeeMonthlyTarget;
}

export const EmployeeMonthlyTarget =
  mongoose.models.EmployeeMonthlyTarget ||
  mongoose.model("EmployeeMonthlyTarget", employeeMonthlyTargetSchema);
