export const REJECTION_REASONS = [
  "Not Interested",
  "Language Barrier",
  "Not Connected",
  "Budget Issue",
  "Other",
] as const;

export type RejectionReason = (typeof REJECTION_REASONS)[number];
