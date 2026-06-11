import { z } from "zod";

const emptyBankDetails = {
  accountHolderName: "",
  iban: "",
  bankName: "",
  swiftBic: "",
};

export const userSchema = z.object({
  name: z.string().min(1, "Please enter your name"),
  email: z.string().optional(),
  profilePic: z.string().optional().default(""),
  sendDetails: z.boolean().optional().default(false),
  nationality: z.string().min(1, "Please enter your nationality"),
  gender: z.enum(["Male", "Female", "Other"]),
  spokenLanguage: z.string().min(1, "Please Enter the language "),
  bankDetails: z.string().optional(),
  phone: z.string().min(1, "Phone number is required"),
  myRequests: z.array(z.string()).optional(),
  myUpcommingRequests: z.array(z.string()).optional(),
  declinedRequests: z.array(z.string()).optional(),
  country: z.string().optional(),
  address: z.string().min(1, "Address is required"),
  password: z.string().optional(),
  isVerified: z.boolean().optional().default(false),
  role: z.enum(["Owner", "Traveller"]),
  forgotPasswordToken: z.string().optional(),
  forgotPasswordTokenExpiry: z.date().optional(),
  verifyToken: z.string().optional(),
  verifyTokenExpiry: z.date().optional(),
  otpToken: z.number().optional(),
  otpTokenExpiry: z.date().optional(),
  origin: z.string().optional(),
  isProfileComplete: z.boolean().optional().default(false),
  shortTermOwner: z.boolean().optional().default(false),
  ownerProfileCompletedAt: z.date().nullable().optional().default(null),
});

/** Minimal owner account for short-term sheet — profile completed on Vacation Saga */
export const shortTermOwnerUserSchema = z.object({
  name: z.string().min(1, "Please enter your name"),
  email: z.string().min(1, "Email is required"),
  phone: z.string().min(1, "Phone number is required"),
  role: z.literal("Owner"),
  sendDetails: z.boolean().optional().default(false),
  gender: z.enum(["Male", "Female", "Other"]).default("Male"),
  spokenLanguage: z.string().optional().default("English"),
  nationality: z.string().optional().default(""),
  address: z.string().optional().default(""),
  bankDetails: z.string().optional().default(""),
  profilePic: z.string().optional().default(""),
  shortTermOwner: z.boolean().optional().default(true),
});

export type UserSchema = z.infer<typeof userSchema>;

export { emptyBankDetails };
