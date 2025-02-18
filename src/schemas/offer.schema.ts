import { z } from "zod";

const validLeadStatus = [
  "Not Interested",
  "Language Barrier",
  "Call Back",
  "Not Connected",
  "Send Offer",
  "Reject Lead",
  "Blacklist Lead",
] as const;

const validReminders = [
  "Reminder 1",
  "Reminder 2",
  "Reminder 3",
  "Last Reminder",
] as const;

const availableOnValues = ["VacationSaga", "TechTunes"] as const;

const offerValidationSchema = z.object({
  phoneNumber: z.number().min(1, { message: "Phone number is required" }),
  // .regex(/^\+?[1-9]\d{1,14}$/, { message: "Please enter a valid phone number" }),

  leadStatus: z
    .string()
    .min(1, { message: "Lead status is required" })
    .refine((val) => validLeadStatus.includes(val as (typeof validLeadStatus)[number]), {
      message: "{VALUE} is not a valid lead status",
    }),

  name: z.string().min(1, { message: "Name is required" }),

  propertyName: z.string().min(1, { message: "Property name is required" }),

  relation: z.string().min(1, { message: "Relation is required" }),

  email: z
    .string()
    .email({ message: "Please enter a valid email address" })
    .min(1, { message: "Email is required" }),

  propertyUrl: z
    .string()
    .url({ message: "Please enter a valid URL" })
    .min(1, { message: "Property URL is required" }),

  country: z.string().min(1, { message: "Country is required" }),

  state: z.string().min(1, { message: "State is required" }),

  city: z.string().min(1, { message: "City is required" }),

  plan: z.string().min(1, { message: "Plan is required" }),

  discount: z.number().min(0, { message: "Discount cannot be negative" }),

  effectivePrice: z.number().min(0, { message: "Effective price cannot be negative" }),

  expiryDate: z.date().optional(),

  callBackDate: z.date().optional(),

  callBackTime: z.string().optional(),

  reminder: z
    .array(z.object({ reminderNo: z.string(), date: z.date() }))
    .refine(
      (val) =>
        val.every((reminder) =>
          validReminders.includes(reminder.reminderNo as (typeof validReminders)[number])
        ),
      {
        message: "{VALUE} is not a valid reminder",
      }
    ),

  availableOn: z
    .array(z.string())
    .refine(
      (arr) =>
        arr.every((item) =>
          availableOnValues.includes(item as (typeof availableOnValues)[number])
        ),
      {
        message: 'Array can only contain "VacationSaga" and/or "TechTunes"',
      }
    )
    .optional(),
});

export default offerValidationSchema;
