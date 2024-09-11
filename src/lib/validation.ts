// lib/validation.ts
import { z } from 'zod';

export const userSchema = z.object({
  name: z.string().min(3, "Name is required"),
  email: z.string().email("Invalid email address"),
  contact: z.string().min(1, "Contact is required"),
  gender: z.string().nonempty("Gender is required"),
  nationality: z.string().min(1, "Nationality is required"),
  language: z.string().min(1, "Language is required"),
  address: z.string().min(1, "Address is required"),
  contactDetails: z.string().optional(),
  bankDetails: z.string().optional(),
});

export type FormData = z.infer<typeof userSchema>;
