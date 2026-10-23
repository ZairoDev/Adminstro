import { z } from "zod";

export const scheduleInterviewBodySchema = z.object({
  scheduledDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Scheduled date is required"),
  scheduledTime: z
    .string()
    .regex(
      /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      "Invalid time format. Use HH:MM format"
    ),
  notes: z.string().max(2000).optional(),
  interviewMode: z.enum(["physical", "virtual"], {
    errorMap: () => ({
      message: "Interview mode is required (physical or virtual)",
    }),
  }),
  officeAddressId: z.string().optional(),
  interviewerEmployeeId: z.string().min(1, "Interviewer is required"),
});

export type ScheduleInterviewBody = z.infer<typeof scheduleInterviewBodySchema>;
