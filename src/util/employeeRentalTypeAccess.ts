import { escapeRegExp } from "@/util/regex";

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

export function buildBookingTermMongoFilter(
  rentalType: unknown,
  role: string,
): Record<string, unknown> | null {
  const allowed = getAllowedBookingTerms(rentalType, role);
  if (!allowed || allowed.length === 0) {
    return null;
  }

  return {
    bookingTerm: {
      $in: allowed.map(
        (term) => new RegExp(`^${escapeRegExp(term)}$`, "i"),
      ),
    },
  };
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
  rentalType: unknown,
  role: string,
  bookingTerm: unknown,
): boolean {
  const allowed = getAllowedBookingTerms(rentalType, role);
  if (!allowed) return true;
  const normalized = normalizeLeadBookingTerm(bookingTerm);
  return allowed.some(
    (term) => term.toLowerCase() === normalized.toLowerCase(),
  );
}

function appendBookingTermClause(
  query: Record<string, unknown>,
  clause: Record<string, unknown>,
): Record<string, unknown> {
  if (query.bookingTerm !== undefined) {
    const { bookingTerm: _existing, ...rest } = query;
    const andList = Array.isArray(rest.$and) ? [...rest.$and] : [];
    andList.push(clause);
    return { ...rest, $and: andList };
  }

  if (Array.isArray(query.$and)) {
    return { ...query, $and: [...query.$and, clause] };
  }

  return { ...query, ...clause };
}

export function applyRentalTypeToLeadQuery(
  query: Record<string, unknown>,
  rentalType: unknown,
  role: string,
): Record<string, unknown> {
  const bookingTermClause = buildBookingTermMongoFilter(rentalType, role);
  if (!bookingTermClause) {
    return query;
  }

  return appendBookingTermClause(query, bookingTermClause);
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
