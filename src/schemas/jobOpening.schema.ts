import { z } from "zod";

const employmentType = z.enum(["fulltime", "intern"]).nullable().optional();

export const createJobOpeningSchema = z.object({
  title: z.string().trim().min(1, "Job title is required"),
  departmentId: z.string().trim().min(1, "Department is required"),
  jobPositionId: z.string().trim().min(1, "Job position is required"),
  summary: z.string().trim().min(1, "A short summary is required").max(400),
  description: z.string().trim().min(1, "Describe the job"),
  responsibilities: z.string().trim().optional().default(""),
  requirements: z.string().trim().optional().default(""),
  location: z.string().trim().optional().default(""),
  employmentType,
  isPublished: z.boolean().optional().default(false),
});

export const updateJobOpeningSchema = z
  .object({
    title: z.string().trim().min(1, "Job title is required").optional(),
    departmentId: z.string().trim().min(1).optional(),
    jobPositionId: z.string().trim().min(1).optional(),
    summary: z.string().trim().min(1).max(400).optional(),
    description: z.string().trim().min(1).optional(),
    responsibilities: z.string().trim().optional(),
    requirements: z.string().trim().optional(),
    location: z.string().trim().optional(),
    employmentType,
    isPublished: z.boolean().optional(),
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: "Nothing to update",
  });

export type CreateJobOpeningInput = z.infer<typeof createJobOpeningSchema>;
export type UpdateJobOpeningInput = z.infer<typeof updateJobOpeningSchema>;
