import mongoose, { Schema } from "mongoose";

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
    assignedTo: {
      type: String,
      required: [true, "Please select an agent"],
    },
  },
  { timestamps: true }
);

const Aliases = mongoose.models.Aliases || mongoose.model("Aliases", aliasSchema);
export default Aliases;
