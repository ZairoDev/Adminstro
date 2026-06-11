import Query from "@/models/query";
import WhatsAppConversation from "@/models/whatsappConversation";
import {
  getDispositionActionConfig,
  WHATSAPP_CRM_LABELS,
  type WhatsAppDispositionAction,
} from "./crmLabels";
import {
  addLabelsToConversation,
  linkLeadToConversation,
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
};

export type ApplyDispositionResult = {
  leadId: string | null;
  leadStatus: string;
  labels: string[];
  conversationId: string;
};

export async function applyWhatsAppDisposition(
  params: ApplyDispositionParams,
): Promise<ApplyDispositionResult> {
  const config = getDispositionActionConfig(params.action);
  if (!config) {
    throw Object.assign(new Error("Invalid disposition action"), { status: 400 });
  }

  if (config.requiresReason && !params.reason?.trim() && params.action !== "set_reminder") {
    throw Object.assign(new Error("Reason is required for this disposition"), {
      status: 400,
    });
  }

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
      .select("name email phoneNo location leadStatus reason reminder minBudget maxBudget")
      .lean()) as LeadLookupResult | null;
    if (found?._id) {
      lead = { ...found, _id: String(found._id) };
    }
  } else {
    lead = await findLeadByPhoneOrEmail({ phone: conversation.participantPhone });
  }

  const labelsToAdd: string[] = [...config.labelsToAdd];
  if (params.action === "custom" && params.customLabel?.trim()) {
    labelsToAdd.push(params.customLabel.trim());
  }

  let leadStatus = config.leadStatus;
  let reason = params.reason?.trim() || "";

  if (params.action === "set_reminder") {
    if (!params.reminderAt) {
      throw Object.assign(new Error("Reminder date/time is required"), { status: 400 });
    }
    const reminderDate = new Date(params.reminderAt);
    if (Number.isNaN(reminderDate.getTime())) {
      throw Object.assign(new Error("Invalid reminder date"), { status: 400 });
    }

    if (lead?._id) {
      await Query.findByIdAndUpdate(lead._id, {
        $set: {
          leadStatus: "reminder",
          reminder: reminderDate,
          reason: reminderDate.toISOString(),
        },
      });
    }

    const reminderResult = await createWhatsAppReminder({
      token: params.token,
      conversationId: params.conversationId,
      scheduledAt: params.reminderAt,
      note: params.reason?.trim() || "Follow up",
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
    };
  }

  if (lead?._id) {
    await Query.findByIdAndUpdate(lead._id, {
      $set: {
        leadStatus,
        reason,
        ...(params.action === "blocked" ? { whatsappBlocked: true } : {}),
      },
    });
  }

  const labels = await addLabelsToConversation(
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
  };
}

export async function addVisitScheduledLabel(conversationId: string): Promise<string[]> {
  return addLabelsToConversation(conversationId, [
    WHATSAPP_CRM_LABELS.VISIT_SCHEDULED,
  ]);
}
