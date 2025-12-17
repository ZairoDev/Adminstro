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
    assignedCountry:{
      type:String,
      default:""
    },
    empType:{
      type:String,
      default:""
    },
    salary:{
      type:Number,
      default:0
    },
    isVerified: {
      type: Boolean,
      default: true,
    },
    role: {
      type: String,
      enum: [
        "Intern",
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
        "Subscription-Sales",
      ],
      default: "Advert",
    },
    duration:{
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    inactiveReason: {
      type: String,
      enum: ["terminated", "suspended", "abscond", null],
      default: null,
    },
    inactiveDate: {
      type: Date,
      default: null,
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
    warnings: {
      type: [
        {
          warningType: {
            type: String,
            enum: [
              "disciplineIssue",
              "lateAttendance",
              "unplannedLeaves",
              "poshWarning",
              "combinedWarning",
            ],
            required: true,
          },
          reason: { type: String, required: true },
          department: { type: String, required: true },
          reportingManager: { type: String, required: true },
          issuedBy: { type: String, required: true },
          issuedAt: { type: Date, default: Date.now },
          emailSent: { type: Boolean, default: false },
          notes: { type: String, default: "" },
        },
      ],
      default: [],
    },
    pips: {
      type: [
        {
          pipLevel: {
            type: String,
            enum: ["level1", "level2", "level3"],
            required: true,
          },
          startDate: { type: String, required: true },
          endDate: { type: String, required: true },
          concerns: { type: [String], default: [] },
          issuedBy: { type: String, required: true },
          issuedAt: { type: Date, default: Date.now },
          emailSent: { type: Boolean, default: false },
          status: {
            type: String,
            enum: ["active", "completed", "failed"],
            default: "active",
          },
          notes: { type: String, default: "" },
        },
      ],
      default: [],
    },
    appreciations: {
      type: [
        {
          appreciationType: {
            type: String,
            enum: [
              "outstandingContribution",
              "outstandingAchievement",
              "excellentAttendance",
            ],
            required: true,
          },
          reason: { type: String, required: true },
          issuedBy: { type: String, required: true },
          issuedAt: { type: Date, default: Date.now },
          emailSent: { type: Boolean, default: false },
          notes: { type: String, default: "" },
        },
      ],
      default: [],
    },
    isLoggedIn: {
      type: Boolean,
      default: false,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    lastLogout: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

const Employees =
  mongoose.models?.Employees ||
  mongoose.model<IEmployee>("Employees", employeeSchema);
export default Employees;
