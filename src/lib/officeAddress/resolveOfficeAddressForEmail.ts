import {
  MissingOfficeAddressError,
  resolveCandidateOfficeAddress,
} from "./resolveCandidateOfficeAddress";

const FALLBACK_OFFICE_ADDRESS =
  "Office address will be shared by HR before your visit.";

/**
 * Resolve office address string for interview emails.
 * Never throws — returns a clear fallback if candidate has no office.
 */
export async function resolveOfficeAddressForEmail(
  candidateId: string,
): Promise<string> {
  try {
    const office = await resolveCandidateOfficeAddress({ candidateId });
    return office.companyAddress || FALLBACK_OFFICE_ADDRESS;
  } catch (err) {
    if (!(err instanceof MissingOfficeAddressError)) {
      console.warn("[office-address] email resolve failed:", err);
    }
    return FALLBACK_OFFICE_ADDRESS;
  }
}
