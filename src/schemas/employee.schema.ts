import { z } from "zod";

export const employeeSchema = z.object({
  name: z.string().min(1, "Please enter your name"),
  email: z.string().email("Please enter a valid email address"),
  profilePic: z.string().optional().default(""),
  allotedArea: z.array(z.string()).optional(),
  nationality: z.string().min(1, "Please enter your nationality"),
  gender: z.enum(["Male", "Female", "Other"]),
  spokenLanguage: z.string().min(1, "Please Enter the language "),
  accountNo: z.string().optional(),
  ifsc: z.string().optional(),
  phone: z.string().min(1, "Phone number is required"),
  aadhar: z.string().min(1, "Please enter your Aadhar number"),
  dateOfJoining: z.date(),
  dateOfBirth: z.date(),
  experience: z.number().optional().default(0),
  alias: z.string().optional(),
  country: z.string().min(1, "Please enter your country"),
  address: z.string().min(1, "Address is required"),
  password: z.string().min(1, "Please enter your password"),
  isVerified: z.boolean().optional().default(true),
  role: z.enum([
    "Admin",
    "Advert",
    "Content",
    "LeadGen",
    "LeadGen-TeamLead",
    "Sales",
    "Sales-TeamLead",
    "HR",
    "Guest",
    "Developer",
  ]),
  assignedCountry: z.string().optional().default(""),
  empType: z.string().optional().default(""),
  isLoggedIn: z.boolean().optional().default(false),
  lastLogin: z.date().optional(),
  lastLogout: z.date().optional(),
  salary: z.number().optional().default(0),
  duration: z.string().optional().default(""),
  isActive: z.boolean().optional().default(true),
  inactiveReason: z.enum(["terminated", "suspended", "abscond"]).nullable().optional().default(null),
  inactiveDate: z.date().nullable().optional().default(null),
  isfeatured: z.boolean().optional().default(false),
  passwordExpiresAt: z.date().optional(),
  extras: z
    .record(
      z.union([
        z.string(),
        z.number(),
        z.boolean(),
        z.array(z.string()),
        z.array(z.number()),
      ])
    )
    .optional(),
  forgotPasswordToken: z.string().optional(),
  forgotPasswordTokenExpiry: z.date().optional(),
  verifyToken: z.string().optional(),
  verifyTokenExpiry: z.date().optional(),
  otpToken: z.number().optional(),
  otpTokenExpiry: z.date().optional(),
  warnings: z
    .array(
      z.object({
        warningType: z.enum([
          "disciplineIssue",
          "lateAttendance",
          "unplannedLeaves",
          "poshWarning",
          "combinedWarning",
        ]),
        reason: z.string(),
        department: z.string(),
        reportingManager: z.string(),
        issuedBy: z.string(),
        issuedAt: z.date(),
        emailSent: z.boolean().default(false),
        notes: z.string().optional().default(""),
      })
    )
    .optional()
    .default([]),
  pips: z
    .array(
      z.object({
        pipLevel: z.enum(["level1", "level2", "level3"]),
        startDate: z.string(),
        endDate: z.string(),
        concerns: z.array(z.string()).default([]),
        issuedBy: z.string(),
        issuedAt: z.date(),
        emailSent: z.boolean().default(false),
        status: z.enum(["active", "completed", "failed"]).default("active"),
        notes: z.string().optional().default(""),
      })
    )
    .optional()
    .default([]),
  appreciations: z
    .array(
      z.object({
        appreciationType: z.enum([
          "outstandingContribution",
          "outstandingAchievement",
          "excellentAttendance",
        ]),
        reason: z.string(),
        issuedBy: z.string(),
        issuedAt: z.date(),
        emailSent: z.boolean().default(false),
        notes: z.string().optional().default(""),
      })
    )
    .optional()
    .default([]),
});

export type EmployeeSchema = z.infer<typeof employeeSchema>;
