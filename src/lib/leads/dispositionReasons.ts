/**
 * Shared rejection / decline reason lists — must stay aligned with
 * LeadTable, good-table, and /api/sales/rejectionReason validation.
 */

/** Fresh-leads reject submenu (rolebaseLead) */
export const LEAD_REJECTION_REASONS = [
  "Not on whatsapp",
  "Not Replying",
  "Low Budget",
  "Blocked on whatsapp",
  "Late Response",
  "Delayed the travelling",
  "Off Location",
  "Number of people exceeded",
  "Already got it",
  "Different Area",
  "Agency Fees",
  "Low Duration",
  "Ghosted",
] as const;

/** Good-to-go decline submenu */
export const LEAD_DECLINE_REASONS = [
  "Blocked on whatsapp",
  "Late Response",
  "Delayed the travelling",
  "Already got it",
  "Didn't like the option",
  "Different Area",
  "Agency Fees",
  "Ghosted",
] as const;

export type LeadRejectionReason = (typeof LEAD_REJECTION_REASONS)[number];
export type LeadDeclineReason = (typeof LEAD_DECLINE_REASONS)[number];

/** Values accepted by Query.rejectionReason enum + rejectionReason API */
export const QUERY_REJECTION_REASON_ENUM = [
  "Not on whatsapp",
  "Not Replying",
  "Low Budget",
  "Blocked on whatsapp",
  "Late Response",
  "Delayed the Traveling",
  "Off Location",
  "Number of people exceeded",
  "Already got it",
  "Different Area",
  "Agency Fees",
  "Didn't like the option",
  "Low Duration",
] as const;

export type QueryRejectionReasonEnum =
  (typeof QUERY_REJECTION_REASON_ENUM)[number];

const REJECTION_REASON_ALIASES: Record<string, QueryRejectionReasonEnum> = {
  "delayed the travelling": "Delayed the Traveling",
  "delayed the traveling": "Delayed the Traveling",
};

export function toQueryRejectionReasonEnum(
  reason: string,
): QueryRejectionReasonEnum | null {
  const trimmed = reason.trim();
  if (!trimmed) return null;

  if ((QUERY_REJECTION_REASON_ENUM as readonly string[]).includes(trimmed)) {
    return trimmed as QueryRejectionReasonEnum;
  }

  const alias = REJECTION_REASON_ALIASES[trimmed.toLowerCase()];
  if (alias) return alias;

  return null;
}

export function isLeadRejectionReason(
  value: string,
): value is LeadRejectionReason {
  return (LEAD_REJECTION_REASONS as readonly string[]).includes(value);
}

export function isLeadDeclineReason(value: string): value is LeadDeclineReason {
  return (LEAD_DECLINE_REASONS as readonly string[]).includes(value);
}
