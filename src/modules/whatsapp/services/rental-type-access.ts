/**
 * WhatsApp Rental-Type Visibility — Single Source of Truth
 *
 * Extends the canonical visibility contract with a rental-type dimension:
 *
 *   Visibility = PhoneAccess AND participantLocationKey AND rentalType
 *
 * Backward-compatibility rules (CRITICAL — live system):
 * - Full-access roles (SuperAdmin/Admin/HAdmin/Developer) bypass rental-type entirely.
 * - An employee with NO rentalType configured defaults to Long Term for WhatsApp
 *   visibility, routing, and create flows (they do not see Short Term clients).
 * - A conversation with NO rentalType (legacy / pre-backfill) is visible to everyone
 *   who already passes the phone + location checks.
 * - "General" channels/conversations are visible to every location-matched employee
 *   regardless of the employee's own rentalType.
 */

import {
  normalizeEmployeeRentalType,
  normalizeLeadBookingTerm,
} from "@/util/employeeRentalTypeAccess";

export type WhatsAppChannelRentalType = "Short Term" | "Long Term" | "General";

export const WHATSAPP_CHANNEL_RENTAL_TYPES: readonly WhatsAppChannelRentalType[] = [
  "Short Term",
  "Long Term",
  "General",
];

export type CreateConversationRentalType = "Short Term" | "Long Term";

/** Default rental type for legacy conversations and manual owner/guest creation. */
export const DEFAULT_CONVERSATION_RENTAL_TYPE: CreateConversationRentalType = "Long Term";

/**
 * Effective rental type for WhatsApp visibility and routing.
 * Employees without an allotted rentalType default to Long Term (not unrestricted).
 */
export function resolveWhatsAppEmployeeRentalType(
  userRentalType: unknown,
): CreateConversationRentalType {
  return normalizeEmployeeRentalType(userRentalType) ?? DEFAULT_CONVERSATION_RENTAL_TYPE;
}

/** Roles that see every rental type (mirror of full WhatsApp access + HAdmin). */
const RENTAL_TYPE_FULL_ACCESS_ROLES: readonly string[] = [
  "SuperAdmin",
  "Admin",
  "HAdmin",
  "Developer",
];

export function isRentalTypeFullAccessRole(role: string | undefined): boolean {
  return RENTAL_TYPE_FULL_ACCESS_ROLES.includes((role || "").trim());
}

/** Sales interns use both ST/LT owner sheets — see all rental types on WhatsApp. */
export function isDualRentalWhatsAppRole(role: string | undefined): boolean {
  return (role || "").trim() === "sales-intern";
}

export function normalizeChannelRentalType(
  value: unknown,
): WhatsAppChannelRentalType | null {
  const trimmed = String(value ?? "").trim();
  if (trimmed === "Short Term" || trimmed === "Long Term" || trimmed === "General") {
    return trimmed;
  }
  return null;
}

/**
 * Runtime check: may a user (by role + their employee rentalType) see a
 * conversation with the given rentalType?
 *
 * Returns true (visible) in all backward-compatible / unrestricted cases.
 */
export function rentalTypeVisibleToUser(
  userRole: string | undefined,
  userRentalType: unknown,
  conversationRentalType: unknown,
): boolean {
  if (isRentalTypeFullAccessRole(userRole) || isDualRentalWhatsAppRole(userRole)) {
    return true;
  }

  const employeeRental = resolveWhatsAppEmployeeRentalType(userRentalType);
  const convRental = normalizeChannelRentalType(conversationRentalType);
  // Legacy conversation with no rentalType → visible.
  if (!convRental) return true;
  // General conversations are visible to everyone with location access.
  if (convRental === "General") return true;

  return convRental === employeeRental;
}

/**
 * Resolve which rental type applies when creating a new owner/guest chat.
 * - SuperAdmin: uses client choice (defaults to Long Term).
 * - Other staff: uses employee.rentalType when set, else Long Term (legacy default).
 */
/**
 * Effective rental type for channel routing on an existing conversation.
 * Unset / legacy values default to Long Term.
 */
export function resolveConversationRentalType(
  rentalType: unknown,
): CreateConversationRentalType {
  const normalized = normalizeChannelRentalType(rentalType);
  if (normalized === "Short Term" || normalized === "Long Term") {
    return normalized;
  }
  return DEFAULT_CONVERSATION_RENTAL_TYPE;
}

export function resolveCreateConversationRentalType(params: {
  userRole?: string;
  userRentalType?: unknown;
  requestedRentalType?: unknown;
}): CreateConversationRentalType {
  const role = (params.userRole || "").trim();

  if (role === "SuperAdmin") {
    const requested = normalizeEmployeeRentalType(params.requestedRentalType);
    return requested ?? DEFAULT_CONVERSATION_RENTAL_TYPE;
  }

  return resolveWhatsAppEmployeeRentalType(params.userRentalType);
}

/** Map CRM lead bookingTerm → WhatsApp channel rental type. */
export function bookingTermToConversationRentalType(
  bookingTerm: unknown,
): CreateConversationRentalType | null {
  const term = normalizeLeadBookingTerm(bookingTerm);
  if (term === "Short Term") return "Short Term";
  if (term === "Long Term" || term === "Mid Term") return "Long Term";
  return null;
}

/**
 * Rental type when opening WhatsApp from a CRM deep link (leads / owner sheet).
 * Honors an explicit rentalType/bookingTerm when the employee may use that line.
 */
export function resolveLeadLinkedConversationRentalType(params: {
  userRole?: string;
  userRentalType?: unknown;
  requestedRentalType?: unknown;
  bookingTerm?: unknown;
}): CreateConversationRentalType {
  const fromParam = normalizeChannelRentalType(params.requestedRentalType);
  const fromBooking =
    fromParam === "Short Term" || fromParam === "Long Term"
      ? fromParam
      : bookingTermToConversationRentalType(params.bookingTerm);

  const leadRental =
    fromParam === "Short Term" || fromParam === "Long Term"
      ? fromParam
      : fromBooking;

  if (!leadRental) {
    return resolveCreateConversationRentalType(params);
  }

  const role = (params.userRole || "").trim();
  if (isRentalTypeFullAccessRole(role) || isDualRentalWhatsAppRole(role)) {
    return leadRental;
  }

  const employeeRental = resolveWhatsAppEmployeeRentalType(params.userRentalType);
  if (leadRental === employeeRental) {
    return leadRental;
  }

  return resolveCreateConversationRentalType(params);
}

/**
 * Mongo `$or` clause restricting conversations to the rental types an employee
 * may see. Returns null only for full-access roles.
 */
export function buildRentalTypeVisibilityClause(
  userRole: string | undefined,
  userRentalType: unknown,
): Record<string, unknown> | null {
  if (isRentalTypeFullAccessRole(userRole) || isDualRentalWhatsAppRole(userRole)) {
    return null;
  }

  const employeeRental = resolveWhatsAppEmployeeRentalType(userRentalType);

  return {
    $or: [
      { rentalType: employeeRental },
      { rentalType: "General" },
      { rentalType: { $exists: false } },
      { rentalType: null },
      { rentalType: "" },
    ],
  };
}
