import mongoose, { Schema } from "mongoose";
import { ORGANIZATIONS } from "@/util/organizationConstants";

const aliasSchema = new Schema(
  {
    aliasName: {
      type: String,
      required: [true, "Please enter your name"],
    },
    aliasEmail: {
      type: String,
      required: [true, "Please enter your email"],
    },
    aliasEmailPassword: {
      type: String,
      required: [true, "Please enter your email password"],
    },
    status: {
      type: String,
      enum: {
        values: ["Active", "Inactive"],
        message: "Please select a valid status",
      },
    },
    organization: {
      type: String,
      enum: [...ORGANIZATIONS],
      required: [true, "Organization is required"],
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "Employees",
      required: [true, "Please select an agent"],
    },
  },
  { timestamps: true }
);

const Aliases = mongoose.models.Aliases || mongoose.model("Aliases", aliasSchema);
export default Aliases;
