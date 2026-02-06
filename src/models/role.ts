import mongoose, { Schema } from "mongoose";

interface RoleInterface {
  roleName: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const roleSchema: Schema = new Schema<RoleInterface>(
  {
    roleName: {
      type: String,
      required: [true, "Please enter the role name"],
      trim: true,
      unique: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Roles =
  mongoose.models?.Roles ||
  mongoose.model<RoleInterface>("Roles", roleSchema);

export default Roles;
