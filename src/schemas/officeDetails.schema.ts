import {z} from "zod";
import mongoose from "mongoose";

// This is a helper function for the zod schem to know whether the value is a valid object id or not
const isObjectId = (value:string) => mongoose.Types.ObjectId.isValid(value);

export const officeDetailsSchema = z.object({
    employeeId: z.string().refine(isObjectId, "Invalid employee id"),
    officeAddressId: z.string().refine(isObjectId, "invalid office address id").nullable(),
    assignedEmail: z.string().email("Enter a valid email address").nullable(),
    assignedNumber: z.string().regex(/^[0-9+\-\s]{7,15}$/, "Please enter a valid phone number").nullable(),

});

export type OfficeDetailsInput = z.infer<typeof officeDetailsSchema>;