import mongoose from "mongoose";
import PersonalReminder from "@/models/personalReminder";
import WhatsAppConversation from "@/modules/whatsapp/models/conversation.model";
import { WHATSAPP_CRM_LABELS } from "./crm-labels";
import { addLabelsToConversation } from "./conversation-label.service";
import { canAccessConversationAsync } from "./access";
import type { WhatsAppToken } from "./api-context";
import { normalizeWhatsAppToken } from "./api-context";

export type CreateWhatsAppReminderParams = {
  token: WhatsAppToken;
  conversationId: string;
  scheduledAt: string;
  note: string;
  leadQueryId?: string;
};

export async function createWhatsAppReminder(
  params: CreateWhatsAppReminderParams,
) {
  const normalized = normalizeWhatsAppToken(params.token);
  const conversation = (await WhatsAppConversation.findById(
    params.conversationId,
  ).lean()) as {
    _id: unknown;
    participantName?: string;
    participantPhone?: string;
    leadQueryId?: unknown;
  } | null;

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

  const scheduledAt = new Date(params.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) {
    throw Object.assign(new Error("Invalid scheduled date"), { status: 400 });
  }

  const note = params.note?.trim();
  if (!note) {
    throw Object.assign(new Error("Reminder note is required"), { status: 400 });
  }

  const participantName =
    conversation.participantName?.trim() || conversation.participantPhone;

  const reminder = await PersonalReminder.create({
    employeeId: new mongoose.Types.ObjectId(normalized.id),
    title: `WhatsApp: ${participantName}`,
    note,
    scheduledAt,
    status: "pending",
    whatsappConversationId: conversation._id,
    leadQueryId: params.leadQueryId
      ? new mongoose.Types.ObjectId(params.leadQueryId)
      : conversation.leadQueryId ?? undefined,
  });

  await WhatsAppConversation.findByIdAndUpdate(params.conversationId, {
    $set: {
      hasActiveReminder: true,
      reminderAt: scheduledAt,
      reminderNote: note,
    },
  });

  const labels = await addLabelsToConversation(params.conversationId, [
    WHATSAPP_CRM_LABELS.REMINDER_SET,
  ]);

  return { reminder, labels };
}

export async function getEmployeeWhatsAppReminders(
  employeeId: string,
  opts: { includePast?: boolean } = {},
) {
  const query: Record<string, unknown> = {
    employeeId,
    whatsappConversationId: { $exists: true, $ne: null },
    status: "pending",
  };

  if (!opts.includePast) {
    query.scheduledAt = { $gte: new Date() };
  }

  return PersonalReminder.find(query)
    .sort({ scheduledAt: 1 })
    .limit(50)
    .lean();
}
