import { z } from "zod";

const propertyValidationSchema = z.object({
  VSID: z
    .string()
    .length(7, "VSID must be exactly 7 characters long")
    .regex(/^[A-Za-z0-9]+$/, "VSID must contain only alphanumeric characters"),
  commonId: z.string(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  userId: z.string(),
  rentalType: z.string().optional(),
  isInstantBooking: z.boolean().default(false),
  propertyType: z.string().optional(),
  propertyName: z.string().optional(),
  placeName: z.string().optional(),
  newPlaceName: z.string().optional(),
  rentalForm: z.string().optional(),
  street: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  internalCity: z.string().optional(),
  internalArea: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  center: z
    .object({
      lat: z.number().optional(),
      lng: z.number().optional(),
    })
    .optional(),
  size: z.number().optional(),
  guests: z.number().optional(),
  bedrooms: z.number().optional(),
  beds: z.number().optional(),
  bathroom: z.number().optional(),
  kitchen: z.number().optional(),
  childrenAge: z.number().optional(),
  basePrice: z.number().optional(),
  basePriceLongTerm: z.number().optional(),
  pricePerDay: z.array(z.array(z.number())).optional(),
  icalLinks: z.string().optional(),
  weekendPrice: z.number().optional(),
  weeklyDiscount: z.number().optional(),
  monthlyDiscount: z.number().optional(),
  currency: z.string().optional(),
  generalAmenities: z.record(z.boolean()).optional(),
  otherAmenities: z.record(z.boolean()).optional(),
  safeAmenities: z.record(z.boolean()).optional(),
  smoking: z.string().optional(),
  pet: z.string().optional(),
  party: z.string().optional(),
  cooking: z.string().optional(),
  additionalRules: z.array(z.string()).optional(),
  reviews: z.string().optional(),
  newReviews: z.string().optional(),
  propertyImages: z.string().optional(),
  propertyCoverFileUrl: z.string().optional(),
  propertyPictureUrls: z.array(z.string()).optional(),
  portionCoverFileUrls: z.array(z.string()).optional(),
  portionPictureUrls: z.array(z.array(z.string())).optional(),
  night: z.array(z.number()).optional(),
  time: z.array(z.number()).optional(),
  datesPerPortion: z.array(z.string()).optional(),

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
    .lte(2025, "Please enter a valid year"),
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
  views: z.number().default(0),
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
  availability: z.string().default("Available"),
});

export type PropertySchema = z.infer<typeof propertyValidationSchema>;
