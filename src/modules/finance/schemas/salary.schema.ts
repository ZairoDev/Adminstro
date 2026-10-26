import { z } from "zod";
import { employeeRoles } from "@/constants/employeeRoles";

const salaryRoleFilters = ["all", ...employeeRoles] as [
  "all",
  ...(typeof employeeRoles),
];

export const listSalariesQuerySchema = z.object({
  search: z.string().trim().max(120).optional().default(""),
  role: z.enum(salaryRoleFilters).optional().default("all"),
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use a month like 2026-10")
    .optional(),
});

export type ListSalariesQuery = z.infer<typeof listSalariesQuerySchema>;

export const updateSalaryBodySchema = z.object({
  gross: z.number().finite().min(0).max(100_000_000),
});

export type UpdateSalaryBody = z.infer<typeof updateSalaryBodySchema>;
