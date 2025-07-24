import { z } from "zod";

export const agentSchema = z.object({
  agentName: z.string().min(1, "Please enter the name"),
  agentEmail: z.string().optional(),
  agentPhone: z.string().min(1, "Please enter the phone number"),
  profilePicture: z.string().optional(),
  nationality: z.string().min(1, "Please enter the nationality"),
  gender: z.enum(["Male", "Female", "Other"]),
  location: z.string().min(1, "Please enter the location"),
  address: z.string().optional(),
  socialAccounts: z.array(z.object({ platform: z.string() })).optional(),
  accountNo: z.string().optional(),
  iban: z.string().optional(),
  note: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type AgentValidationSchema = z.infer<typeof agentSchema>;
