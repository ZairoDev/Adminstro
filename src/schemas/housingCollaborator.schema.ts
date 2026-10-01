import { z } from "zod";

export const HOUSING_COLLABORATOR_SUPPLIES = ["buyer", "property", "both"] as const;

export type HousingCollaboratorSupplies =
  (typeof HOUSING_COLLABORATOR_SUPPLIES)[number];

export const housingCollaboratorSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required"),
    lastName: z.string().trim().min(1, "Last name is required"),
    contact: z.string().trim().min(7, "Contact must be at least 7 characters"),
    email: z.string().trim().email("Invalid email address"),
    country: z.string().trim().min(2, "Country is required"),
    city: z.string().trim().min(2, "City is required"),
    area: z.string().trim().min(2, "Area is required"),
    allotedArea: z
      .array(z.string().trim().min(1))
      .min(1, "Alloted area is required"),
    supplies: z.enum(HOUSING_COLLABORATOR_SUPPLIES, {
      errorMap: () => ({ message: "Please select supplies type" }),
    }),
    sendContractViaEmail: z.boolean().default(false),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Confirm password is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type HousingCollaboratorInput = z.infer<typeof housingCollaboratorSchema>;

export const housingCollaboratorLoginSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const housingCollaboratorResetPasswordSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters").optional(),
  })
  .optional();

export function formatCollaboratorName(firstName: string, lastName: string): string {
  return `${firstName.trim()} ${lastName.trim()}`.trim();
}

export const HOUSING_COLLABORATOR_ACCOUNT_TYPE = "housingCollaborator" as const;
export const HOUSING_COLLABORATOR_ROLE = "HCollaborator" as const;
