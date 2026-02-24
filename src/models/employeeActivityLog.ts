import mongoose, { Schema, Document } from "mongoose";

import type { EmployeeActivityLog } from "@/schemas/employeeActivityLog.schema";

interface IEmployeeActivityLog extends Document, EmployeeActivityLog {}

const employeeActivityLogSchema = new Schema<IEmployeeActivityLog>(
  {
    employeeId: {
      type: String,
      required: [true, "Employee ID is required"],
      index: true,
    },
    employeeName: {
      type: String,
      required: [true, "Employee name is required"],
    },
    employeeEmail: { 
      type: String,
      required: [true, "Employee email is required"],
      index: true,
    },
    role: {
      type: String,
      required: [true, "Role is required"],
    },
    activityType: {
      type: String,
      enum: ["login", "logout"],
      required: [true, "Activity type is required"],
      index: true,
    },
    loginTime: {
      type: Date,
      default: null,
    },
    logoutTime: {
      type: Date,
      default: null,
    },
    duration: {
      type: Number,
      default: 0,
      description: "Duration in minutes",
    },
    ipAddress: {
      type: String,
      default: "",
    },
    userAgent: {
      type: String,
      default: "",
    },
    deviceInfo: {
      type: String,
      default: "",
    },
    location: {
      type: String,
      default: "",
    },
    notes: {
      type: String,
      default: "",
    },
    // Session tracking fields
    sessionId: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "ended"],
      default: null,
      index: true,
    },
    lastActivityAt: {
      type: Date,
      default: null,
    },
  },
  { 
    timestamps: true
  }
);

// Add indexes for performance
employeeActivityLogSchema.index({ employeeId: 1, createdAt: -1 });
employeeActivityLogSchema.index({ createdAt: -1 });
employeeActivityLogSchema.index({ activityType: 1, createdAt: -1 });
employeeActivityLogSchema.index({ sessionId: 1 });

const EmployeeActivityLog =
  mongoose.models?.EmployeeActivityLog ||
  mongoose.model<IEmployeeActivityLog>("EmployeeActivityLog", employeeActivityLogSchema);

export default EmployeeActivityLog;
