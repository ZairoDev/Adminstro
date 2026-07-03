import Query from "@/models/query";
import WhatsAppConversation from "@/models/whatsappConversation";
import {
  isLeadDeclineReason,
  isLeadRejectionReason,
  toQueryRejectionReasonEnum,
} from "@/lib/leads/dispositionReasons";
import {
  assertValidDispositionTransition,
  dispositionRequiresLeadQuality,
  isLeadQualityByReviewer,
  normalizeLeadStatus,
  type CoreWhatsAppDispositionAction,
  type LeadQualityByReviewer,
} from "@/lib/leads/leadDisposition";
import {
  getDispositionActionConfig,
  WHATSAPP_CRM_LABELS,
  type WhatsAppDispositionAction,
} from "./crmLabels";
import {
  linkLeadToConversation,
  addLabelsToConversation,
  replaceDispositionLabels,
} from "./conversationLabelService";
import { createWhatsAppReminder } from "./whatsappReminderService";
import {
  findLeadByPhoneOrEmail,
  type LeadLookupResult,
} from "./leadLookupService";
import { canAccessConversationAsync } from "./access";
import type { WhatsAppToken } from "./apiContext";
import { normalizeWhatsAppToken } from "./apiContext";

export type ApplyDispositionParams = {
  token: WhatsAppToken;
  conversationId: string;
  action: WhatsAppDispositionAction;
  reason?: string;
  customLabel?: string;
  leadId?: string;
  reminderAt?: string;
  leadQualityByReviewer?: string;
};

const CORE_DISPOSITION_ACTIONS = new Set<CoreWhatsAppDispositionAction>([
  "good_to_go",
  "reject_lead",
  "decline_lead",
  "revert_to_fresh",
]);

const FRESH_ONLY_REJECT_ACTIONS = new Set<WhatsAppDispositionAction>([
  "reject_lead",
  "not_interested",
  "low_budget",
  "blocked",
]);

const LEAD_SELECT_FIELDS =
  "name email phoneNo location leadStatus reason rejectionReason leadQualityByReviewer reminder minBudget maxBudget note";

export type ApplyDispositionResult = {
  leadId: string | null;
  leadStatus: string;
  labels: string[];
  conversationId: string;
  lead: LeadLookupResult | null;
  previousLeadStatus: string | null;
};

function buildQueryDispositionUpdate(
  action: WhatsAppDispositionAction,
  reason: string,
  leadStatus: string,
): Record<string, unknown> {
  const trimmedReason = reason.trim();
  const update: Record<string, unknown> = {};

  switch (action) {
    case "good_to_go":
      update.leadStatus = "active";
      update.reason = "";
      update.rejectionReason = null;
      break;
    case "decline_lead":
      update.leadStatus = "declined";
      update.reason = trimmedReason;
      update.rejectionReason = null;
      break;
    case "revert_to_fresh":
      update.leadStatus = "fresh";
      update.reason = null;
      update.rejectionReason = null;
      break;
    case "reject_lead":
    case "not_interested":
    case "low_budget":
    case "blocked":
      update.leadStatus = "rejected";
      update.reason = trimmedReason;
      {
        const enumReason = toQueryRejectionReasonEnum(trimmedReason);
        update.rejectionReason = enumReason;
      }
      if (action === "blocked") {
        update.whatsappBlocked = true;
      }
      break;
    case "already_found":
      update.leadStatus = "closed";
      update.reason = trimmedReason;
      break;
    case "future_follow_up":
      update.leadStatus = "active";
      update.reason = trimmedReason;
      break;
    default:
      update.leadStatus = leadStatus;
      update.reason = trimmedReason;
      break;
  }

  return update;
}

function validateDispositionReason(
  action: WhatsAppDispositionAction,
  reason: string,
): void {
  if (action === "decline_lead" && !isLeadDeclineReason(reason)) {
    throw Object.assign(new Error("Invalid decline reason"), { status: 400 });
  }

  if (
    (action === "reject_lead" ||
      action === "not_interested" ||
      action === "low_budget" ||
      action === "blocked") &&
    !isLeadRejectionReason(reason) &&
    action !== "blocked"
  ) {
    throw Object.assign(new Error("Invalid rejection reason"), { status: 400 });
  }

  if (action === "blocked" && !reason.trim()) {
    throw Object.assign(new Error("Rejection reason is required"), { status: 400 });
  }
}

export async function applyWhatsAppDisposition(
  params: ApplyDispositionParams,
): Promise<ApplyDispositionResult> {
  const config = getDispositionActionConfig(params.action);
  if (!config) {
    throw Object.assign(new Error("Invalid disposition action"), { status: 400 });
  }

  const reason = params.reason?.trim() || "";
  const effectiveReason =
    params.action === "blocked" && !reason
      ? "Blocked on whatsapp"
      : reason;

  if (config.requiresReason && !effectiveReason && params.action !== "set_reminder") {
    throw Object.assign(new Error("Reason is required for this disposition"), {
      status: 400,
    });
  }

  if (effectiveReason) {
    validateDispositionReason(params.action, effectiveReason);
  }

  const requiresLeadQuality =
    CORE_DISPOSITION_ACTIONS.has(params.action as CoreWhatsAppDispositionAction) &&
    dispositionRequiresLeadQuality(params.action as CoreWhatsAppDispositionAction);

  const normalized = normalizeWhatsAppToken(params.token);
  const conversation = (await WhatsAppConversation.findById(
    params.conversationId,
  ).lean()) as { participantPhone?: string } | null;
  if (!conversation) {
    throw Object.assign(new Error("Conversation not found"), { status: 404 });
  }

  const allowed = await canAccessConversationAsync(
    normalized,
    conversation as Record<string, unknown>,
  );
  if (!allowed) {
    throw Object.assign(new Error("Forbidden"), { status: 403 });
  }

  let lead: LeadLookupResult | null = null;
  if (params.leadId) {
    const found = (await Query.findById(params.leadId)
      .select(LEAD_SELECT_FIELDS)
      .lean()) as LeadLookupResult | null;
    if (found?._id) {
      lead = { ...found, _id: String(found._id) };
    }
  } else {
    lead = await findLeadByPhoneOrEmail({ phone: conversation.participantPhone });
  }

  const previousLeadStatus = lead?.leadStatus ?? null;

  if (
    lead?._id &&
    CORE_DISPOSITION_ACTIONS.has(params.action as CoreWhatsAppDispositionAction)
  ) {
    assertValidDispositionTransition(
      previousLeadStatus,
      params.action as CoreWhatsAppDispositionAction,
    );
  }

  if (lead?._id && FRESH_ONLY_REJECT_ACTIONS.has(params.action)) {
    if (normalizeLeadStatus(previousLeadStatus) !== "fresh") {
      throw Object.assign(
        new Error("Reject actions are only allowed while the lead is Fresh."),
        { status: 400 },
      );
    }
  }

  if (lead?._id && requiresLeadQuality) {
    const quality = params.leadQualityByReviewer?.trim() || "";
    if (!quality || !isLeadQualityByReviewer(quality)) {
      throw Object.assign(
        new Error("Please select lead quality before changing disposition"),
        { status: 400 },
      );
    }
  }

  const labelsToAdd: string[] = [...config.labelsToAdd];
  if (params.action === "custom" && params.customLabel?.trim()) {
    labelsToAdd.push(params.customLabel.trim());
  }

  if (params.action === "blocked" && !reason) {
    labelsToAdd.push(WHATSAPP_CRM_LABELS.BLOCKED);
  }

  let leadStatus = config.leadStatus;
  let updatedLead: LeadLookupResult | null = lead;

  if (params.action === "set_reminder") {
    if (!params.reminderAt) {
      throw Object.assign(new Error("Reminder date/time is required"), { status: 400 });
    }
    const reminderDate = new Date(params.reminderAt);
    if (Number.isNaN(reminderDate.getTime())) {
      throw Object.assign(new Error("Invalid reminder date"), { status: 400 });
    }

    if (lead?._id) {
      const saved = await Query.findByIdAndUpdate(
        lead._id,
        {
          $set: {
            leadStatus: "reminder",
            reminder: reminderDate,
            reason: reminderDate.toISOString(),
          },
        },
        { new: true, validateBeforeSave: false },
      )
        .select(LEAD_SELECT_FIELDS)
        .lean<LeadLookupResult>();
      if (saved?._id) {
        updatedLead = { ...saved, _id: String(saved._id) };
      }
    }

    const reminderResult = await createWhatsAppReminder({
      token: params.token,
      conversationId: params.conversationId,
      scheduledAt: params.reminderAt,
      note: reason || "Follow up",
      leadQueryId: lead?._id ? String(lead._id) : undefined,
    });

    if (lead?._id) {
      await linkLeadToConversation(params.conversationId, String(lead._id));
    }

    return {
      leadId: lead?._id ? String(lead._id) : null,
      leadStatus: "reminder",
      labels: reminderResult.labels,
      conversationId: params.conversationId,
      lead: updatedLead,
      previousLeadStatus,
    };
  }

  if (lead?._id) {
    const queryUpdate: Record<string, unknown> = buildQueryDispositionUpdate(
      params.action,
      effectiveReason,
      leadStatus,
    );

    if (requiresLeadQuality && params.leadQualityByReviewer) {
      queryUpdate.leadQualityByReviewer =
        params.leadQualityByReviewer as LeadQualityByReviewer;
    }

    leadStatus = String(queryUpdate.leadStatus ?? leadStatus);

    const saved = await Query.findByIdAndUpdate(
      lead._id,
      { $set: queryUpdate },
      { new: true, validateBeforeSave: false },
    )
      .select(LEAD_SELECT_FIELDS)
      .lean<LeadLookupResult>();

    if (saved?._id) {
      updatedLead = { ...saved, _id: String(saved._id) };
    }
  }

  const labels = await replaceDispositionLabels(
    params.conversationId,
    labelsToAdd,
  );

  if (lead?._id) {
    await linkLeadToConversation(params.conversationId, String(lead._id));
  }

  return {
    leadId: lead?._id ? String(lead._id) : null,
    leadStatus,
    labels,
    conversationId: params.conversationId,
    lead: updatedLead,
    previousLeadStatus,
  };
}

export async function addVisitScheduledLabel(conversationId: string): Promise<string[]> {
  return addLabelsToConversation(conversationId, [
    WHATSAPP_CRM_LABELS.VISIT_SCHEDULED,
  ]);
}
