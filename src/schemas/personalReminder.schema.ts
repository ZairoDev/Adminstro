import { z } from "zod";

export const personalReminderStatusEnum = z.enum(["pending", "sent", "cancelled"]);

export const createPersonalReminderSchema = z.object({
  title: z.string().trim().max(200).optional().default(""),
  note: z.string().trim().min(1, "Note is required").max(2000),
  scheduledAt: z.coerce.date().refine((d) => !isNaN(d.getTime()), "Invalid date"),
});

export const updatePersonalReminderSchema = z.object({
  title: z.string().trim().max(200).optional(),
  note: z.string().trim().min(1).max(2000).optional(),
  scheduledAt: z.coerce.date().optional(),
  status: personalReminderStatusEnum.optional(),
});

export type CreatePersonalReminderInput = z.infer<typeof createPersonalReminderSchema>;
export type UpdatePersonalReminderInput = z.infer<typeof updatePersonalReminderSchema>;
