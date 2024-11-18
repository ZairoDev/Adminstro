import { z } from "zod";

const QuicklistingValidationSchema = z.object({
  ownerName: z.string(),
  ownerMobile: z.string(),
  propertyName: z.string(),
  propertyImages: z.array(z.string()),
  description: z.string(),
  basePrice: z.number(),
  address: z.string(),
});

export type QuicklistingValidationSchema = z.infer<
  typeof QuicklistingValidationSchema
>;
