import { z } from "zod";

export const createDepartmentSchema = z.object({
  name: z.string().trim().min(1, "Department name is required"),
  isActive: z.boolean().optional().default(true),
});

export const updateDepartmentSchema = z
  .object({
    name: z.string().trim().min(1, "Department name is required").optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => value.name !== undefined || value.isActive !== undefined, {
    message: "Nothing to update",
  });

export const createJobPositionSchema = z.object({
  name: z.string().trim().min(1, "Job position name is required"),
  isActive: z.boolean().optional().default(true),
});

export const updateJobPositionSchema = z
  .object({
    name: z.string().trim().min(1, "Job position name is required").optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => value.name !== undefined || value.isActive !== undefined, {
    message: "Nothing to update",
  });

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;
export type CreateJobPositionInput = z.infer<typeof createJobPositionSchema>;
export type UpdateJobPositionInput = z.infer<typeof updateJobPositionSchema>;
