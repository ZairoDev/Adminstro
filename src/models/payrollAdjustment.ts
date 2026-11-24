import mongoose, { Schema, type InferSchemaType } from "mongoose";

const payrollAdjustmentSchema = new Schema(
  {
    employeeId: { type: String, required: true },
    monthKey: { type: String, required: true },
    pf: { type: Number, default: 0 },
    incentive: { type: Number, default: 0 },
    casual: { type: Number, default: 0 },
    cash: { type: Number, default: 0 },
    advance: { type: Number, default: 0 },
    hold: { type: Number, default: 0 },
  },
  { timestamps: true },
);

payrollAdjustmentSchema.index({ employeeId: 1, monthKey: 1 }, { unique: true });

export type PayrollAdjustmentDoc = InferSchemaType<typeof payrollAdjustmentSchema> & {
  _id: mongoose.Types.ObjectId;
};

const PayrollAdjustment =
  (mongoose.models.PayrollAdjustment as mongoose.Model<PayrollAdjustmentDoc> | undefined) ??
  mongoose.model<PayrollAdjustmentDoc>("PayrollAdjustment", payrollAdjustmentSchema, "payrollAdjustments");

export default PayrollAdjustment;
