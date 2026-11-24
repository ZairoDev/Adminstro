import { z } from "zod";
import { PAYROLL_ADJUSTMENT_FIELDS } from "@/modules/finance/salary-sheet";

export const updateSalarySheetBodySchema = z.object({
  employeeId: z.string().trim().min(1),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use a month like 2026-11"),
  field: z.enum(PAYROLL_ADJUSTMENT_FIELDS),
  amount: z.number().finite().min(0).max(10_000_000),
});

export type UpdateSalarySheetBody = z.infer<typeof updateSalarySheetBodySchema>;
