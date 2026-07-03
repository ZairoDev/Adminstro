/**
 * Lead disposition — shared between dashboard lead tables and WhatsApp CRM.
 *
 * Page labels (UI)     →  Query.leadStatus (Mongo)
 * Fresh Leads          →  fresh
 * Good To Go           →  active
 * Rejected             →  rejected
 * Declined             →  declined
 *
 * Allowed transitions:
 *   fresh    → active (Good To Go) | rejected
 *   rejected → fresh (revert)
 *   active   → declined (+ visit is a separate CRM action)
 */

export const LEAD_QUALITY_BY_REVIEWER_OPTIONS = [
  "Good",
  "Average",
  "Below Average",
] as const;

export type LeadQualityByReviewer =
  (typeof LEAD_QUALITY_BY_REVIEWER_OPTIONS)[number];

export type CoreWhatsAppDispositionAction =
  | "good_to_go"
  | "reject_lead"
  | "decline_lead"
  | "revert_to_fresh";

const STATUS_PAGE_LABELS: Record<string, string> = {
  fresh: "Fresh",
  active: "Good To Go",
  rejected: "Rejected",
  declined: "Declined",
  reminder: "Reminder",
  closed: "Closed",
};

export function normalizeLeadStatus(
  leadStatus: string | null | undefined,
): string {
  const trimmed = leadStatus?.trim();
  return trimmed || "fresh";
}

export function formatLeadStatusLabel(
  leadStatus: string | null | undefined,
): string {
  return STATUS_PAGE_LABELS[normalizeLeadStatus(leadStatus)] ?? leadStatus ?? "Fresh";
}

export function isLeadQualityByReviewer(
  value: string,
): value is LeadQualityByReviewer {
  return (LEAD_QUALITY_BY_REVIEWER_OPTIONS as readonly string[]).includes(
    value,
  );
}

/** Actions available for the current lead status (strict funnel rules). */
export function primaryDispositionActionsForLeadStatus(
  leadStatus: string | null | undefined,
): CoreWhatsAppDispositionAction[] {
  switch (normalizeLeadStatus(leadStatus)) {
    case "fresh":
      return ["good_to_go", "reject_lead"];
    case "active":
      return ["decline_lead"];
    case "rejected":
      return ["revert_to_fresh"];
    default:
      return [];
  }
}

export function assertValidDispositionTransition(
  currentStatus: string | null | undefined,
  action: CoreWhatsAppDispositionAction,
): void {
  const allowed = primaryDispositionActionsForLeadStatus(currentStatus);
  if (!allowed.includes(action)) {
    const from = formatLeadStatusLabel(currentStatus);
    throw Object.assign(
      new Error(`This action is not allowed while the lead is on ${from}.`),
      { status: 400 },
    );
  }
}

/** Review required before Good To Go / Reject / Decline — not for revert. */
export function dispositionRequiresLeadQuality(
  action: CoreWhatsAppDispositionAction,
): boolean {
  return action !== "revert_to_fresh";
}

export function dispositionActionToLeadStatus(
  action: CoreWhatsAppDispositionAction,
): string {
  switch (action) {
    case "good_to_go":
      return "active";
    case "reject_lead":
      return "rejected";
    case "decline_lead":
      return "declined";
    case "revert_to_fresh":
      return "fresh";
  }
}
