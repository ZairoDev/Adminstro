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
  basePriceLongTerm: z.array(z.number()).optional(),
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

  area: z.string().min(1, "Please select an Area"),
  subarea: z.string().min(1, "Please select subarea"),
  neighbourhood: z.string().min(1, "Please select Neighbourhood"),
  floor: z.string().min(1, "Please select Floor"),
  isTopFloor: z.boolean().default(false),
  orientation: z.string().min(1, "Please select the orientation of property"),
  levels: z.number().min(1, "Level can not be less than 1"),
  zones: z.string().min(1, "Please select the zone"),
  propertyStyle: z.string().min(1, "Please select the property style"),
  constructionYear: z
    .number()
    .int()
    .gte(1800, "Please enter a valid year")
    .lte(2024, "Please enter a valid year"),
  isSuitableForStudents: z.boolean().default(true),
  monthlyExpenses: z.number().optional(),
  heatingType: z.string().min(1, "Please select a Heating type"),
  heatingMedium: z.string().min(1, "Please select a heating medium"),
  energyClass: z.string().min(1, "Please select a energy class"),

  nearbyLocations: z
    .record(
      z.union([
        z.string(),
        z.number(),
        z.array(z.string()),
        z.array(z.number()),
        z.boolean(),
      ])
    )
    .optional(),

  hostedFrom: z.string().optional(),
  hostedBy: z.string().optional(),
  listedOn: z
    .string()
    .array()
    .min(1, "Atleast one website should be selected")
    .default(["VacationSaga"]),
  lastUpdatedBy: z.array(z.string()).optional(),
  lastUpdates: z.array(z.array(z.string())).optional(),
  isLive: z.boolean().default(true),
});

export type PropertyValidationSchema = z.infer<typeof propertyValidationSchema>;
