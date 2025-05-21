import z from "zod";

export const productSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  price: z.number().min(0),
  category: z.string().min(1),
  tags: z.array(z.string()).optional(),
  image: z.array(z.string()),
  refundPolicy: z.enum(["30-day", "14-day", "7-day", "3-day", "1-day", "no-refunds"]),
});
