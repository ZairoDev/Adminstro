import Query from "@/models/query";
import { normalizeGuestPhone } from "./initiationLimitService";

export type LeadLookupResult = {
  _id: string;
  name?: string;
  email?: string;
  phoneNo?: string;
  location?: string;
  leadStatus?: string;
  reason?: string;
  rejectionReason?: string | null;
  leadQualityByReviewer?: string | null;
  reminder?: Date;
  minBudget?: number;
  maxBudget?: number;
  note?: Array<{
    noteData?: string;
    createdBy?: string;
    createOn?: string;
  }>;
};

function phoneVariants(digits: string): string[] {
  const set = new Set<string>();
  if (!digits) return [];
  set.add(digits);
  set.add(`+${digits}`);
  if (digits.length > 10) set.add(digits.slice(-10));
  return [...set];
}

/**
 * Find CRM lead (Query) by participant phone and/or email.
 */
export async function findLeadByPhoneOrEmail(params: {
  phone?: string;
  email?: string;
}): Promise<LeadLookupResult | null> {
  const email = params.email?.trim().toLowerCase();
  const digits = params.phone ? normalizeGuestPhone(params.phone) : "";

  const or: Record<string, unknown>[] = [];
  if (email) {
    or.push({ email: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") });
  }
  if (digits) {
    for (const variant of phoneVariants(digits)) {
      or.push({ phoneNo: variant });
      or.push({ phone: variant });
      or.push({ whatsappNumber: variant });
    }
  }

  if (or.length === 0) return null;

  const lead = await Query.findOne({ $or: or })
    .select(
      "name email phoneNo location leadStatus reason rejectionReason leadQualityByReviewer reminder minBudget maxBudget note",
    )
    .lean() as LeadLookupResult | null;

  if (!lead?._id) return null;
  return { ...lead, _id: String(lead._id) };
}
