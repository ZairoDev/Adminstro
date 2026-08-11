import mongoose from "mongoose";
import OfficeAddress from "@/models/officeAddress";
import {
  MissingOfficeAddressError,
  resolveCandidateOfficeAddress,
} from "./resolveCandidateOfficeAddress";

const FALLBACK_OFFICE_ADDRESS =
  "Office address will be shared by HR before your visit.";

export type EmailOfficeResolution = {
  address: string;
  officeName?: string | null;
  officeAddressId?: string | null;
};

/**
 * Resolve office address string for interview emails.
 * Prefer an explicit office selected at schedule time; otherwise fall back to
 * the candidate's assigned office. Never throws.
 */
export async function resolveOfficeAddressForEmail(
  candidateId: string,
  interviewOfficeAddressId?: string | null,
): Promise<EmailOfficeResolution> {
  try {
    if (
      interviewOfficeAddressId &&
      mongoose.Types.ObjectId.isValid(String(interviewOfficeAddressId))
    ) {
      const office = await OfficeAddress.findById(interviewOfficeAddressId).lean();
      if (office) {
        const address =
          String(office.formattedAddress || "").trim() || FALLBACK_OFFICE_ADDRESS;
        return {
          address,
          officeName: String(office.name || "").trim() || null,
          officeAddressId: String(office._id),
        };
      }
    }

    const office = await resolveCandidateOfficeAddress({ candidateId });
    return {
      address: office.companyAddress || FALLBACK_OFFICE_ADDRESS,
      officeName: office.name || null,
      officeAddressId: office.officeAddressId || null,
    };
  } catch (err) {
    if (!(err instanceof MissingOfficeAddressError)) {
      console.warn("[office-address] email resolve failed:", err);
    }
    return { address: FALLBACK_OFFICE_ADDRESS, officeName: null, officeAddressId: null };
  }
}
