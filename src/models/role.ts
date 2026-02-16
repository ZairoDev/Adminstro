import mongoose, { Schema, Document } from "mongoose";

export interface IRole extends Document {
  role: string;
  department: string;
  isActive: boolean;
  origin: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const RoleSchema = new Schema<IRole>(
  {
    role: {
      type: String,
      required: [true, "Role name is required"],
      trim: true,
    },
    department: {
      type: String,
      required: [true, "Department is required"],
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    origin: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

// Unique on (role, department, origin): same role+department allowed when origin differs
RoleSchema.index(
  { role: 1, department: 1, origin: 1 },
  { unique: true }
);

// Use collection "addon_roles" to avoid clashing with existing "roles" collection
// (which has a unique index on "roleName" from a different schema)
const Role =
  mongoose.models?.Role ||
  mongoose.model<IRole>("Role", RoleSchema, "addon_roles");

export default Role;
