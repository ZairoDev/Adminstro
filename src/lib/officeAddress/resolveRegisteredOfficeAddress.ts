import OfficeAddress, {
  formatOfficeAddress,
  formatOfficeAddressShort,
  type IOfficeAddress,
} from "@/models/officeAddress";

export class MissingRegisteredOfficeError extends Error {
  constructor(message = "No registered office is configured") {
    super(message);
    this.name = "MissingRegisteredOfficeError";
  }
}

export type ResolvedRegisteredOffice = {
  officeAddressId: string;
  name: string;
  /** Full address with pincode + country */
  companyAddress: string;
  /** Without pincode/country — letterhead "Registered Office:" */
  registeredOfficeShort: string;
  /** With pincode + country — agreement parties clause */
  registeredOfficeFull: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
};

function toResolved(office: IOfficeAddress): ResolvedRegisteredOffice {
  const city = String(office.city || "").trim() || "Kanpur";
  const state = String(office.state || "").trim();
  const pincode = String(office.pincode || "").trim();
  const country = String(office.country || "India").trim();
  const addressParts = {
    addressLine1: String(office.addressLine1 || "").trim(),
    addressLine2: office.addressLine2,
    city,
    state,
    pincode,
    country,
  };
  const companyAddress =
    String(office.formattedAddress || "").trim() ||
    formatOfficeAddress(addressParts);
  return {
    officeAddressId: office._id.toString(),
    name: String(office.name || "").trim(),
    companyAddress,
    registeredOfficeShort: formatOfficeAddressShort(addressParts),
    registeredOfficeFull: formatOfficeAddress(addressParts),
    city,
    state,
    pincode,
    country,
  };
}

/**
 * Legal registered office for HR PDFs / letterheads.
 * Independent of the candidate's assigned work-location office.
 */
export async function resolveRegisteredOfficeAddress(): Promise<ResolvedRegisteredOffice> {
  const flagged = await OfficeAddress.findOne({ isRegisteredOffice: true });
  if (flagged) {
    return toResolved(flagged as unknown as IOfficeAddress);
  }

  // Legacy fallback until seed/backfill marks Kanpur
  const kanpur = await OfficeAddress.findOne({
    $or: [
      { name: /^Kanpur Office$/i },
      { city: /^Kanpur$/i },
    ],
  }).sort({ isActive: -1, createdAt: 1 });

  if (kanpur) {
    return toResolved(kanpur as unknown as IOfficeAddress);
  }

  throw new MissingRegisteredOfficeError(
    "No registered office is configured. Mark one office as the registered office.",
  );
}

/** Clear the flag on every other office, then set it on `officeId`. */
export async function setRegisteredOffice(officeId: string): Promise<void> {
  await OfficeAddress.updateMany(
    { _id: { $ne: officeId }, isRegisteredOffice: true },
    { $set: { isRegisteredOffice: false } },
  );
  await OfficeAddress.updateOne(
    { _id: officeId },
    { $set: { isRegisteredOffice: true } },
  );
}

export function missingRegisteredOfficeResponse() {
  return {
    success: false,
    error:
      "No registered office is configured. Mark one office as the registered office in Office Addresses.",
    code: "MISSING_REGISTERED_OFFICE",
  };
}
