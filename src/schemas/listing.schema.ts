import { z } from "zod";

const propertyValidationSchema = z.object({
  VSID: z
    .string()
    .length(7, "VSID must be exactly 7 characters long")
    .regex(/^[A-Za-z0-9]+$/, "VSID must contain only alphanumeric characters"),
  email: z.string().email(),
  rentalType: z.string().optional(),
  userId: z.string(),
  propertyType: z.string().optional(),
  placeName: z.string().optional(),
  newPlaceName: z.string().optional(),
  rentalForm: z.string().optional(),
  numberOfPortions: z.number().min(1).default(1),
  street: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  center: z
    .object({
      lat: z.number().optional(),
      lng: z.number().optional(),
    })
    .optional(),
  portionName: z.array(z.string()).optional(),
  portionSize: z.array(z.number()).optional(),
  guests: z.array(z.number()).optional(),
  bedrooms: z.array(z.number()).optional(),
  beds: z.array(z.number()).optional(),
  bathroom: z.array(z.number()).optional(),
  kitchen: z.array(z.number()).optional(),
  childrenAge: z.array(z.number()).optional(),
  basePrice: z.array(z.number()).optional(),
  weekendPrice: z.array(z.number()).optional(),
  monthlyDiscount: z.array(z.number()).optional(),
  currency: z.string().optional(),
  generalAmenities: z.record(z.boolean()).optional(),
  otherAmenities: z.record(z.boolean()).optional(),
  safeAmenities: z.record(z.boolean()).optional(),
  smoking: z.string().optional(),
  pet: z.string().optional(),
  party: z.string().optional(),
  cooking: z.string().optional(),
  additionalRules: z.array(z.string()).optional(),
  reviews: z.array(z.string()).optional(),
  newReviews: z.string().optional(),
  propertyCoverFileUrl: z.string().optional(),
  propertyPictureUrls: z.array(z.string()).optional(),
  portionCoverFileUrls: z.array(z.string()).optional(),
  portionPictureUrls: z.array(z.array(z.string())).optional(),
  night: z.array(z.number()).optional(),
  time: z.array(z.number()).optional(),
  datesPerPortion: z.array(z.array(z.string())).optional(),
  hostedFrom: z.string().optional(),
  lastUpdatedBy: z.array(z.string()).optional(),
  lastUpdates: z.array(z.array(z.string())).optional(),
  isLive: z.boolean().default(true),
});

export type PropertyValidationSchema = z.infer<typeof propertyValidationSchema>;
