import mongoose, { Schema } from "mongoose";
import { AgentValidationSchema } from "@/schemas/agent.schema";

const agentSchema: Schema = new Schema<AgentValidationSchema>(
  {
    agentName: {
      type: String,
      required: [true, "Please enter the name"],
      trim: true,
    },
    agentEmail: {
      type: String,
      trim: true,
      set: (value: string) => value.toLowerCase(),
    },
    agentPhone: {
      type: String,
      required: [true, "Please enter the phone number"],
      trim: true,
      set: (value: string) => value.replace(/\D/g, ""),
    },
    profilePicture: {
      type: String,
      trim: true,
    },
    nationality: {
      type: String,
      required: [true, "Please enter the nationality"],
      trim: true,
      set: (value: string) => value.toLowerCase(),
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      required: true,
    },
    location: {
      type: String,
      required: [true, "Please enter the location"],
      trim: true,
      set: (value: string) => value.toLowerCase(),
    },
    address: {
      type: String,
      trim: true,
    },
    socialAccounts: {
      type: Map,
      of: String,
    },
    accountNo: {
      type: String,
      trim: true,
    },
    ifsc: {
      type: String,
      trim: true,
    },
    note: {
      type: String,
      trim: true,
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

const Agents =
  mongoose.models?.Agents ||
  mongoose.model<AgentValidationSchema>("Agents", agentSchema);

export default Agents;
