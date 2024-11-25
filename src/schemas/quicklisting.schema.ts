import { z } from "zod";

const QuicklistingValidationSchema = z.object({
  QID: z.string(),
  ownerName: z.string(),
  ownerMobile: z.string(),
  propertyName: z.string(),
  propertyImages: z.array(z.string()),
  description: z.string(),
  basePrice: z.number(),
  address: z.string(),
  isFavourite: z.boolean().default(false),
});

export type QuicklistingValidationSchema = z.infer<
  typeof QuicklistingValidationSchema
>;
