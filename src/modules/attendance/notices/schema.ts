import { z } from "zod";

export const markNoticeReadSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid notice"),
});
