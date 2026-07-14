import mongoose from "mongoose";
import Candidate from "@/models/candidate";
import OfficeAddress, { type IOfficeAddress } from "@/models/officeAddress";
import { seedDefaultOffices } from "./seedDefaultOffices";

export class MissingOfficeAddressError extends Error {
  constructor(message = "Candidate has no office address assigned") {
    super(message);
    this.name = "MissingOfficeAddressError";
  }
}

export type ResolvedOfficeAddress = {
  officeAddressId: string;
  name: string;
  companyAddress: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  postingLocation: string;
  agreementCity: string;
  jurisdictionCity: string;
  workLocation: string;
};

function toResolved(office: IOfficeAddress): ResolvedOfficeAddress {
  const city = String(office.city || "").trim() || "Kanpur";
  const companyAddress = String(office.formattedAddress || "").trim();
  return {
    officeAddressId: office._id.toString(),
    name: String(office.name || "").trim(),
    companyAddress,
    city,
    state: String(office.state || "").trim(),
    pincode: String(office.pincode || "").trim(),
    country: String(office.country || "India").trim(),
    postingLocation: city,
    agreementCity: city,
    jurisdictionCity: city,
    workLocation: city,
  };
}

/**
 * Resolve the office address for a candidate.
 * Prefers officeAddressId; falls back to matching officeLocation city against seeded offices.
 */
export async function resolveCandidateOfficeAddress(params: {
  candidateId?: string | null;
  candidate?: {
    _id?: unknown;
    officeAddressId?: unknown;
    officeLocation?: unknown;
  } | null;
}): Promise<ResolvedOfficeAddress> {
  let candidate = params.candidate ?? null;

  if (!candidate && params.candidateId) {
    if (!mongoose.Types.ObjectId.isValid(params.candidateId)) {
      throw new MissingOfficeAddressError("Invalid candidate id");
    }
    candidate = await Candidate.findById(params.candidateId)
      .select("officeAddressId officeLocation")
      .lean();
  }

  if (!candidate) {
    throw new MissingOfficeAddressError("Candidate not found");
  }

  const officeAddressId =
    (candidate as any).officeAddressId?.toString?.() ||
    (candidate as any).officeAddressId ||
    null;

  if (officeAddressId && mongoose.Types.ObjectId.isValid(String(officeAddressId))) {
    const office = await OfficeAddress.findById(officeAddressId);
    if (office) {
      return toResolved(office as unknown as IOfficeAddress);
    }
  }

  // Legacy fallback: match denormalized officeLocation (Kanpur / Noida) to seeded offices
  const locationLabel = String((candidate as any).officeLocation || "").trim();
  if (locationLabel) {
    await seedDefaultOffices();
    const byCity = await OfficeAddress.findOne({
      isActive: true,
      $or: [
        { city: new RegExp(`^${escapeRegex(locationLabel)}$`, "i") },
        { name: new RegExp(escapeRegex(locationLabel), "i") },
      ],
    });
    if (byCity) {
      return toResolved(byCity as unknown as IOfficeAddress);
    }
  }

  throw new MissingOfficeAddressError(
    "No office address assigned for this candidate. Assign an office address before generating documents.",
  );
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Format for API error responses when office is missing. */
export function missingOfficeAddressResponse() {
  return {
    success: false,
    error:
      "No office address assigned for this candidate. Assign an office address in the candidate portal before generating documents.",
    code: "MISSING_OFFICE_ADDRESS",
  };
}
