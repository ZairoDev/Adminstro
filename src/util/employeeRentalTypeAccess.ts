export const EMPLOYEE_RENTAL_TYPES = ["Short Term", "Long Term"] as const;

export type EmployeeRentalType = (typeof EMPLOYEE_RENTAL_TYPES)[number];
export type OwnerSheetVariant = "long-term" | "short-term";

const LONG_TERM_BOOKING_TERMS = ["Long Term", "Mid Term"] as const;
const SHORT_TERM_BOOKING_TERMS = ["Short Term"] as const;

export function normalizeLeadBookingTerm(value: unknown): string {
  const trimmed = String(value ?? "").trim();
  if (/^short\s*term$/i.test(trimmed)) return "Short Term";
  if (/^mid\s*term$/i.test(trimmed)) return "Mid Term";
  if (/^long\s*term$/i.test(trimmed)) return "Long Term";
  return trimmed;
}

export function formatEmployeeRentalTypeLabel(rentalType: unknown): string {
  return normalizeEmployeeRentalType(rentalType) ?? "All";
}

export function normalizeEmployeeRentalType(
  value: unknown,
): EmployeeRentalType | null {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return null;
  if (trimmed === "Short Term" || trimmed === "Long Term") {
    return trimmed;
  }
  return null;
}

export function isRentalTypeUnrestricted(rentalType: unknown): boolean {
  return normalizeEmployeeRentalType(rentalType) === null;
}

export function isRentalTypeExemptRole(role: string): boolean {
  return (
    (role || "").trim() === "SuperAdmin" ||
    (role || "").trim() === "LeadGen-TeamLead"
  );
}

export function resolveEmployeeRentalType(
  tokenRentalType: unknown,
  dbRentalType?: unknown,
): EmployeeRentalType | null {
  const fromToken = normalizeEmployeeRentalType(tokenRentalType);
  if (fromToken) return fromToken;
  return normalizeEmployeeRentalType(dbRentalType);
}

export function canAccessOwnerSheetVariant(
  rentalType: unknown,
  role: string,
  variant: OwnerSheetVariant,
): boolean {
  if (isRentalTypeExemptRole(role) || isRentalTypeUnrestricted(rentalType)) {
    return true;
  }

  const normalized = normalizeEmployeeRentalType(rentalType);
  if (!normalized) return true;

  if (variant === "long-term") return normalized === "Long Term";
  return normalized === "Short Term";
}

export function getDefaultOwnerSheetPath(
  rentalType: unknown,
  role: string,
): "/spreadsheet" | "/spreadsheet-short-term" {
  const normalized = normalizeEmployeeRentalType(rentalType);
  if (normalized === "Short Term") return "/spreadsheet-short-term";
  return "/spreadsheet";
}

export function getAllowedBookingTerms(
  rentalType: unknown,
  role: string,
): readonly string[] | null {
  if (isRentalTypeExemptRole(role) || isRentalTypeUnrestricted(rentalType)) {
    return null;
  }

  const normalized = normalizeEmployeeRentalType(rentalType);
  if (!normalized) return null;

  if (normalized === "Short Term") {
    return SHORT_TERM_BOOKING_TERMS;
  }

  return LONG_TERM_BOOKING_TERMS;
}

export function isLeadBookingTermAllowed(
  _rentalType: unknown,
  _role: string,
  _bookingTerm: unknown,
): boolean {
  // Guest leads are not split by rental type. A Short Term salesperson still
  // sees Long Term and Mid Term guests in their allotted city. Rental type
  // only chooses which owner sheet they can open.
  return true;
}

export function applyRentalTypeToLeadQuery(
  query: Record<string, unknown>,
  _rentalType: unknown,
  _role: string,
): Record<string, unknown> {
  // Do not add a bookingTerm clause. SuperAdmin filtering a city and a sales
  // user allotted to that city must see the same guest leads when no pricing
  // or property-visibility rule is on. Rental type remains an owner-sheet limit.
  return query;
}

export function assertOwnerSheetApiAccess(
  rentalType: unknown,
  role: string,
  variant: OwnerSheetVariant,
): { allowed: true } | { allowed: false; message: string } {
  if (canAccessOwnerSheetVariant(rentalType, role, variant)) {
    return { allowed: true };
  }

  const normalized = normalizeEmployeeRentalType(rentalType);
  return {
    allowed: false,
    message:
      normalized === "Short Term"
        ? "Your account is restricted to the Short Term owner sheet."
        : "Your account is restricted to the Long Term owner sheet.",
  };
}
