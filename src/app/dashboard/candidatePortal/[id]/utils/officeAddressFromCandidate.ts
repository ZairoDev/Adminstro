import type { Candidate } from "@/app/dashboard/candidatePortal/[id]/types";

type PopulatedOffice = {
  _id: string;
  name: string;
  city: string;
  formattedAddress?: string;
};

function getPopulatedOffice(
  candidate: Pick<Candidate, "officeAddressId">,
): PopulatedOffice | null {
  const office = candidate.officeAddressId;
  if (office && typeof office === "object" && "_id" in office) {
    return office as PopulatedOffice;
  }
  return null;
}

/** City used for agreementCity / jurisdiction defaults in PDF payloads. */
export function getCandidateOfficeCity(candidate: Candidate): string {
  return (
    getPopulatedOffice(candidate)?.city ||
    candidate.officeLocation ||
    candidate.city ||
    ""
  );
}

/** Full address or city for postingLocation in PDF payloads. */
export function getCandidateOfficePostingLocation(candidate: Candidate): string {
  const office = getPopulatedOffice(candidate);
  return (
    office?.formattedAddress ||
    office?.city ||
    candidate.officeLocation ||
    candidate.city ||
    ""
  );
}
