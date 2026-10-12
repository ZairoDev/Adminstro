import WhatsAppConversation from "@/models/whatsappConversation";
import {
  PRIMARY_DISPOSITION_CRM_LABELS,
  WHATSAPP_CRM_LABELS,
  primaryDispositionLabelsForLeadStatus,
  type WhatsAppCrmLabel,
} from "./crmLabels";

/** Labels replaced when applying a new CRM disposition from WhatsApp */
const DISPOSITION_LABEL_VALUES: WhatsAppCrmLabel[] = [
  ...PRIMARY_DISPOSITION_CRM_LABELS,
  WHATSAPP_CRM_LABELS.REMINDER_SET,
  WHATSAPP_CRM_LABELS.FUTURE,
  WHATSAPP_CRM_LABELS.LOW_BUDGET,
  WHATSAPP_CRM_LABELS.ALREADY_FOUND,
  WHATSAPP_CRM_LABELS.NOT_INTERESTED,
  WHATSAPP_CRM_LABELS.BLOCKED,
  WHATSAPP_CRM_LABELS.FOLLOW_UP,
];
export async function addLabelsToConversation(
  conversationId: string,
  labelsToAdd: string[],
  opts: { replace?: boolean } = {},
): Promise<string[]> {
  const unique = [...new Set(labelsToAdd.map((l) => l.trim()).filter(Boolean))];
  if (unique.length === 0 && !opts.replace) {
    const current = await WhatsAppConversation.findById(conversationId)
      .select("labels")
      .lean() as { labels?: string[] } | null;
    return current?.labels ?? [];
  }

  const update = opts.replace
    ? { $set: { labels: unique } }
    : { $addToSet: { labels: { $each: unique } } };

  const updated = await WhatsAppConversation.findByIdAndUpdate(
    conversationId,
    update,
    { new: true },
  )
    .select("labels")
    .lean() as { labels?: string[] } | null;

  return updated?.labels ?? [];
}

export async function removeLabelFromConversation(
  conversationId: string,
  label: string,
): Promise<string[]> {
  const updated = await WhatsAppConversation.findByIdAndUpdate(
    conversationId,
    { $pull: { labels: label.trim() } },
    { new: true },
  )
    .select("labels")
    .lean() as { labels?: string[] } | null;

  return updated?.labels ?? [];
}

export async function setConversationLabels(
  conversationId: string,
  labels: string[],
): Promise<string[]> {
  return addLabelsToConversation(conversationId, labels, { replace: true });
}

export async function linkLeadToConversation(
  conversationId: string,
  leadQueryId: string,
): Promise<void> {
  await WhatsAppConversation.findByIdAndUpdate(conversationId, {
    $set: { leadQueryId },
  });
}

/**
 * Swap disposition workflow labels while keeping visit / custom labels intact.
 */
export async function replaceDispositionLabels(
  conversationId: string,
  labelsToAdd: string[],
): Promise<string[]> {
  const current = await WhatsAppConversation.findById(conversationId)
    .select("labels")
    .lean() as { labels?: string[] } | null;

  const dispositionSet = new Set<string>(DISPOSITION_LABEL_VALUES);
  const kept = (current?.labels ?? []).filter((l) => !dispositionSet.has(l));
  const next = [
    ...new Set([
      ...kept,
      ...labelsToAdd.map((l) => l.trim()).filter(Boolean),
    ]),
  ];

  return setConversationLabels(conversationId, next);
}

/** Align primary funnel labels on a conversation with the linked lead status. */
export async function syncPrimaryDispositionLabels(
  conversationId: string,
  leadStatus: string | null | undefined,
): Promise<string[]> {
  return replaceDispositionLabels(
    conversationId,
    primaryDispositionLabelsForLeadStatus(leadStatus),
  );
}
