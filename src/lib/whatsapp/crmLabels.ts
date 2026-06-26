/**
 * WhatsApp CRM label constants — single source of truth for inbox filters,
 * disposition auto-labeling, and sidebar chips.
 */

export const WHATSAPP_CRM_LABELS = {
  GOOD_TO_GO: "Good To Go",
  REJECTED: "Rejected",
  DECLINED: "Declined",
  REMINDER_SET: "Reminder Set",
  FUTURE: "Future",
  LOW_BUDGET: "Low Budget",
  ALREADY_FOUND: "Already Found",
  NOT_INTERESTED: "Not Interested",
  BLOCKED: "Blocked",
  VISIT_SCHEDULED: "Visit Scheduled",
  VISIT_COMPLETED: "Visit Completed",
  FOLLOW_UP: "Follow Up",
} as const;

export type WhatsAppCrmLabel =
  (typeof WHATSAPP_CRM_LABELS)[keyof typeof WHATSAPP_CRM_LABELS];

/** Sidebar / API filter keys (URL-safe) → Mongo label value */
export const WHATSAPP_LABEL_FILTER_MAP: Record<string, WhatsAppCrmLabel> = {
  "good-to-go": WHATSAPP_CRM_LABELS.GOOD_TO_GO,
  rejected: WHATSAPP_CRM_LABELS.REJECTED,
  declined: WHATSAPP_CRM_LABELS.DECLINED,
  "visit-scheduled": WHATSAPP_CRM_LABELS.VISIT_SCHEDULED,
  future: WHATSAPP_CRM_LABELS.FUTURE,
  "low-budget": WHATSAPP_CRM_LABELS.LOW_BUDGET,
  blocked: WHATSAPP_CRM_LABELS.BLOCKED,
  "reminder-set": WHATSAPP_CRM_LABELS.REMINDER_SET,
  "follow-up": WHATSAPP_CRM_LABELS.FOLLOW_UP,
};

export const SIDEBAR_LABEL_FILTERS: Array<{
  key: string;
  label: string;
}> = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "owners", label: "Owners" },
  { key: "guests", label: "Guests" },
  { key: "good-to-go", label: WHATSAPP_CRM_LABELS.GOOD_TO_GO },
  { key: "rejected", label: WHATSAPP_CRM_LABELS.REJECTED },
  { key: "declined", label: WHATSAPP_CRM_LABELS.DECLINED },
  { key: "visit-scheduled", label: WHATSAPP_CRM_LABELS.VISIT_SCHEDULED },
  { key: "future", label: WHATSAPP_CRM_LABELS.FUTURE },
  { key: "low-budget", label: WHATSAPP_CRM_LABELS.LOW_BUDGET },
  { key: "blocked", label: WHATSAPP_CRM_LABELS.BLOCKED },
  { key: "reminder-set", label: WHATSAPP_CRM_LABELS.REMINDER_SET },
];

export type WhatsAppDispositionAction =
  | "good_to_go"
  | "reject_lead"
  | "decline_lead"
  | "set_reminder"
  | "future_follow_up"
  | "already_found"
  | "not_interested"
  | "low_budget"
  | "blocked"
  | "custom";

export type DispositionActionConfig = {
  action: WhatsAppDispositionAction;
  label: string;
  leadStatus: string;
  labelsToAdd: WhatsAppCrmLabel[];
  requiresReason?: boolean;
};

export const WHATSAPP_DISPOSITION_ACTIONS: DispositionActionConfig[] = [
  {
    action: "good_to_go",
    label: "Good To Go",
    leadStatus: "active",
    labelsToAdd: [WHATSAPP_CRM_LABELS.GOOD_TO_GO],
  },
  {
    action: "reject_lead",
    label: "Reject Lead",
    leadStatus: "rejected",
    labelsToAdd: [WHATSAPP_CRM_LABELS.REJECTED],
    requiresReason: true,
  },
  {
    action: "decline_lead",
    label: "Decline Lead",
    leadStatus: "declined",
    labelsToAdd: [WHATSAPP_CRM_LABELS.DECLINED],
    requiresReason: true,
  },
  {
    action: "set_reminder",
    label: "Set Reminder",
    leadStatus: "reminder",
    labelsToAdd: [WHATSAPP_CRM_LABELS.REMINDER_SET],
  },
  {
    action: "future_follow_up",
    label: "Future Follow Up",
    leadStatus: "active",
    labelsToAdd: [WHATSAPP_CRM_LABELS.FUTURE, WHATSAPP_CRM_LABELS.FOLLOW_UP],
  },
  {
    action: "already_found",
    label: "Already Found Property",
    leadStatus: "closed",
    labelsToAdd: [WHATSAPP_CRM_LABELS.ALREADY_FOUND],
  },
  {
    action: "not_interested",
    label: "Not Interested",
    leadStatus: "rejected",
    labelsToAdd: [WHATSAPP_CRM_LABELS.NOT_INTERESTED, WHATSAPP_CRM_LABELS.REJECTED],
    requiresReason: true,
  },
  {
    action: "low_budget",
    label: "Low Budget",
    leadStatus: "rejected",
    labelsToAdd: [WHATSAPP_CRM_LABELS.LOW_BUDGET, WHATSAPP_CRM_LABELS.REJECTED],
    requiresReason: true,
  },
  {
    action: "blocked",
    label: "Blocked",
    leadStatus: "rejected",
    labelsToAdd: [WHATSAPP_CRM_LABELS.BLOCKED],
    requiresReason: true,
  },
  {
    action: "custom",
    label: "Custom Disposition",
    leadStatus: "active",
    labelsToAdd: [],
    requiresReason: true,
  },
];

export function getDispositionActionConfig(
  action: WhatsAppDispositionAction,
): DispositionActionConfig | undefined {
  return WHATSAPP_DISPOSITION_ACTIONS.find((a) => a.action === action);
}

export function isUnreadInboxLabelFilter(
  labelFilter: string | null | undefined,
): boolean {
  return labelFilter?.trim().toLowerCase() === "unread";
}

export function resolveLabelFilterMongo(
  labelFilter: string | null | undefined,
): Record<string, unknown> | null {
  const raw = labelFilter?.trim().toLowerCase();
  if (!raw || raw === "all") return null;
  // Unread is per-employee — resolved in inboxUnreadQuery, not on conversation docs.
  if (raw === "unread") return null;
  if (raw === "owners") return { conversationType: "owner" };
  if (raw === "guests") return { conversationType: "guest" };

  const label = WHATSAPP_LABEL_FILTER_MAP[raw];
  if (label) return { labels: label };
  return { labels: labelFilter };
}
