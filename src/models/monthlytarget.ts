import mongoose from "mongoose";

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
    isActive: {
      type: Boolean,
      default: true,
    },
    /** When true, new leads in this city stay off the sales board until a lead-gen team lead approves them. */
    requireLeadApproval: {
      type: Boolean,
      default: false,
    },
    area: [{ type: mongoose.Schema.Types.ObjectId, ref: "Area" }],
    leads: { type: Number, required: true },
    visits: { type: Number, required: true },
    sales: { type: Number, required: true },
  },
  { timestamps: true }
);

export const MonthlyTarget =
  mongoose.models.MonthlyTarget ||
  mongoose.model("MonthlyTarget", targetSchema);
