import { z } from "zod";

export const employeeActivityLogSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  employeeName: z.string().min(1, "Employee name is required"),
  employeeEmail: z.string().email("Invalid email"),
  role: z.string().min(1, "Role is required"),
  activityType: z.enum(["login", "logout"], {
    errorMap: () => ({ message: "Activity type must be login or logout" }),
  }),
  loginTime: z.date().optional(),
  logoutTime: z.date().optional(),
  duration: z.number().optional().default(0), // duration in minutes
  ipAddress: z.string().optional().default(""),
  userAgent: z.string().optional().default(""),
  deviceInfo: z.string().optional().default(""),
  location: z.string().optional().default(""),
  // Session tracking fields (backwards compatible - optional)
  sessionId: z.string().optional(),
  status: z.enum(["active", "ended"]).optional(),
  lastActivityAt: z.date().optional(),
  notes: z.string().optional().default(""),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type EmployeeActivityLog = z.infer<typeof employeeActivityLogSchema>;
