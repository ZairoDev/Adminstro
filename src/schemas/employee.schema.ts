import { z } from "zod";

export const employeeSchema = z.object({
  name: z.string().min(1, "Please enter your name"),
  email: z.string().email("Please enter a valid email address"),
  profilePic: z.string().optional().default(""),
  nationality: z.string().min(1, "Please enter your nationality"),
  gender: z.enum(["Male", "Female", "Other"]),
  spokenLanguage: z.string().min(1, "Please Enter the language "),
  accountNo: z.string().optional(),
  ifsc: z.string().optional(),
  phone: z.string().min(1, "Phone number is required"),
  aadhar: z.string().min(1, "Please enter your Aadhar number"),
  dateOfJoining: z.date(),
  experience: z.number().optional().default(0),
  alias: z.string().min(1, "Please enter your Alias").optional(),
  country: z.string().min(1, "Please enter your country"),
  address: z.string().min(1, "Address is required"),
  password: z.string().min(1, "Please enter your password"),
  isVerified: z.boolean().optional().default(true),
  role: z.enum([
    "Admin",
    "Advert",
    "Content",
    "Sales",
    "HR",
    "Developer",
  ]),
  forgotPasswordToken: z.string().optional(),
  forgotPasswordTokenExpiry: z.date().optional(),
  verifyToken: z.string().optional(),
  verifyTokenExpiry: z.date().optional(),
  otpToken: z.number().optional(),
  otpTokenExpiry: z.date().optional(),
});

export type EmployeeSchema = z.infer<typeof employeeSchema>;
