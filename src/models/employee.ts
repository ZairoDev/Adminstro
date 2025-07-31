import mongoose, { Schema, Document } from "mongoose";

import { EmployeeSchema } from "@/schemas/employee.schema";

interface IEmployee extends Document, EmployeeSchema {}
export const employeeRoles = [
  "HR",
  "Admin",
  "Sales",
  "Sales-TeamLead",
  "Guest",
  "Intern",
  "Advert",
  "LeadGen",
  "LeadGen-TeamLead",
  "Content",
  "Developer",
  "Subscription-Sales",
] as const;

const employeeSchema = new Schema<IEmployee>(
  {
    name: {
      type: String,
      required: [true, "Please enter your name"],
    },
    email: {
      type: String,
      required: [true, "Please enter your email"],
    },
    profilePic: {
      type: String,
      default: "",
    },
    nationality: {
      type: String,
      default: "",
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      default: "Male",
    },
    spokenLanguage: {
      type: String,
      default: "English",
    },
    accountNo: {
      type: String,
      default: "",
    },
    ifsc: {
      type: String,
      default: "",
    },
    phone: {
      type: String,
      required: true,
    },
    aadhar: {
      type: String,
      default: "",
    },
    dateOfJoining: {
      type: Date,
      default: new Date(),
    },
    experience: {
      type: Number,
      default: 0,
    },
    alias: {
      type: String,
      default: "",
    },
    country: {
      type: String,
      default: "",
    },
    address: {
      type: String,
      default: "",
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    allotedArea: {
      type: [String],
      required: false,
    },
    isVerified: {
      type: Boolean,
      default: true,
    },
    role: {
      type: String,
      enum: [
        "Admin",
        "Advert",
        "LeadGen",
        "LeadGen-TeamLead",
        "Content",
        "Sales",
        "Sales-TeamLead",
        "HR",
        "Developer",
        "Guest",
        "Intern",
        "Subscription-Sales",
      ],
      default: "Advert",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isfeatured: {
      type: Boolean,
      default: false,
    },
    extras: {
      type: Map,
      of: Schema.Types.Mixed,
    },
    passwordExpiresAt: {
      type: Date,
      default: () => {
        const now = new Date();
        now.setHours(now.getHours() + 24);
        return now;
      },
    },
    forgotPasswordToken: String,
    forgotPasswordTokenExpiry: Date,
    verifyToken: String,
    verifyTokenExpiry: Date,
    otpToken: Number,
    otpTokenExpiry: Date,
  },
  { timestamps: true }
);

const Employees =
  mongoose.models?.Employees ||
  mongoose.model<IEmployee>("Employees", employeeSchema);
export default Employees;
