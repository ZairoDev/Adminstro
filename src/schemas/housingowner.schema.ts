import { z } from "zod";

export const housingOwnerSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters long"),
  email: z.string().email("Invalid email address"),
  phone: z.string().nullable().optional(),
  password: z.string().min(6, "Password must be at least 6 characters long"),
  profilePic: z.string().optional(),
  isVerified: z.boolean().default(false),
  onboarded: z.boolean().default(false),
  verifyToken: z.string().optional(),
  verifyTokenExpiry: z.date().optional(),
  role: z.enum(["owner", "buyer", "admin"]).nullable().optional(),
  subscriptionPlan: z.string().nullable().optional(),
  subscriptionValidTill: z.date().nullable().optional(),
  paymentStatus: z.enum(["active", "inactive"]).nullable().optional(),
  paidListingAddresses: z.array(z.string()).default([]).optional(),
});

export type HousingOwnerValidationSchema = z.infer<typeof housingOwnerSchema>;
