import { z } from "zod";

/** Same type-of-property values as the Vacation Saga Query model. */
export const HOUSING_SAGA_PROPERTY_TYPES = [
  "Apartment",
  "Studio / 1 bedroom",
  "1 Bedroom",
  "2 Bedroom",
  "3 Bedroom",
  "4 Bedroom",
  "Villa",
  "Pent House",
  "Detached House",
  "Loft",
  "Shared Apartment",
  "Maisotte",
  "Studio",
] as const;

export type HousingSagaPropertyType = (typeof HOUSING_SAGA_PROPERTY_TYPES)[number];

export const housingSagaQuerySchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Invalid email address"),
  phoneNo: z.string().trim().min(7, "Phone number is required"),
  typeOfProperty: z.enum(HOUSING_SAGA_PROPERTY_TYPES, {
    errorMap: () => ({ message: "Select a type of property" }),
  }),
  country: z.string().trim().min(1, "Country is required"),
  city: z.string().trim().min(1, "City is required"),
  location: z.string().trim().min(1, "Location is required"),
  minBudget: z.coerce.number().min(0, "Minimum budget is required"),
  maxBudget: z.coerce.number().min(0, "Maximum budget is required"),
}).refine((data) => data.maxBudget >= data.minBudget, {
  message: "Maximum budget must be at least the minimum budget",
  path: ["maxBudget"],
});

export type HousingSagaQueryInput = z.infer<typeof housingSagaQuerySchema>;

export type HousingSagaQueryView = {
  _id: string;
  name: string;
  email: string;
  phoneNo: string;
  typeOfProperty: string;
  country: string;
  city: string;
  location: string;
  minBudget: number;
  maxBudget: number;
  createdBy: string;
  createdAt: string;
};
