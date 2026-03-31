import mongoose, { Schema, Document } from "mongoose";

export interface EmployeeUiRuleFlags {
  hideGuestManagement: boolean;
  hideOwnerManagement: boolean;
}

export interface EmployeeUiRuleSchema {
  name: string;
  description?: string;
  flags: EmployeeUiRuleFlags;
}

interface IEmployeeUiRule extends Document, EmployeeUiRuleSchema {}

const employeeUiRuleSchema = new Schema<IEmployeeUiRule>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    flags: {
      hideGuestManagement: {
        type: Boolean,
        default: false,
      },
      hideOwnerManagement: {
        type: Boolean,
        default: false,
      },
    },
  },
  { timestamps: true },
);

employeeUiRuleSchema.index({ name: 1 }, { unique: true });

const EmployeeUiRule =
  mongoose.models?.EmployeeUiRule ||
  mongoose.model<IEmployeeUiRule>("EmployeeUiRule", employeeUiRuleSchema);

export default EmployeeUiRule;
