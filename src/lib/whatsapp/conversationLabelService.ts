import WhatsAppConversation from "@/models/whatsappConversation";
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
