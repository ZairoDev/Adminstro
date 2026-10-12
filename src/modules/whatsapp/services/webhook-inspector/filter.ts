import { normalizePhone } from "@/lib/whatsapp/normalizePhone";
import type { WebhookInspectorFilter } from "./types";

export function matchesInspectorFilter(
  filter: WebhookInspectorFilter,
  fields: {
    customerPhone?: string | null;
    messageId?: string | null;
    businessPhoneId?: string | null;
    conversationId?: string | null;
  },
): boolean {
  if (!filter.enabled) return false;

  const hasAnyFilter = Boolean(
    filter.customerPhone ||
      filter.messageId ||
      filter.businessPhoneId ||
      filter.conversationId,
  );
  if (!hasAnyFilter) return false;

  if (filter.messageId && fields.messageId !== filter.messageId) {
    return false;
  }
  if (filter.businessPhoneId && fields.businessPhoneId !== filter.businessPhoneId) {
    return false;
  }
  if (filter.conversationId && fields.conversationId !== filter.conversationId) {
    return false;
  }
  if (filter.customerPhone && fields.customerPhone) {
    const a = normalizePhone(filter.customerPhone);
    const b = normalizePhone(fields.customerPhone);
    if (a !== b) return false;
  } else if (filter.customerPhone && !fields.customerPhone) {
    return false;
  }

  return true;
}
