import mongoose, { Schema, type InferSchemaType } from "mongoose";

const employeeShiftAssignmentSchema = new Schema(
  {
    employeeId: { type: String, required: true, index: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    weeklyOffDays: { type: [Number], required: true },
    effectiveFrom: { type: String, required: true },
    effectiveTo: { type: String, default: null },
  },
  { timestamps: true },
);

employeeShiftAssignmentSchema.index({ employeeId: 1, effectiveFrom: 1 });

export type EmployeeShiftAssignmentDoc = InferSchemaType<typeof employeeShiftAssignmentSchema> & {
  _id: mongoose.Types.ObjectId;
};

const EmployeeShiftAssignment =
  (mongoose.models.EmployeeShiftAssignment as
    | mongoose.Model<EmployeeShiftAssignmentDoc>
    | undefined) ??
  mongoose.model<EmployeeShiftAssignmentDoc>(
    "EmployeeShiftAssignment",
    employeeShiftAssignmentSchema,
    "employeeShiftAssignments",
  );

export default EmployeeShiftAssignment;
