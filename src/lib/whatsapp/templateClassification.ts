import type { Template } from "@/app/whatsapp/types";
import { getTemplateBodySnippet } from "@/app/whatsapp/utils";
import type { CreateConversationRentalType } from "@/lib/whatsapp/rentalTypeAccess";
import { DEFAULT_CONVERSATION_RENTAL_TYPE } from "@/lib/whatsapp/rentalTypeAccess";

export type ConversationTemplateRentalType =
  | CreateConversationRentalType
  | "General";

/** Matches backend conversationType rules (conversations route, send-template). */
export function isOwnerWhatsAppTemplateName(templateName: string): boolean {
  const n = templateName.toLowerCase();
  return n.includes("owners_template") || n.startsWith("owner");
}

/**
 * Infer rental type from Meta template name.
 * Naming convention (any of):
 *   Short Term — short_term, shortterm, short-term, _st_, st_*, *_st
 *   Long Term  — long_term, longterm, long-term, _lt_, lt_*, *_lt
 * Unmarked templates are treated as Long Term (legacy default).
 */
export function classifyTemplateRentalType(
  templateName: string,
): CreateConversationRentalType | null {
  const n = templateName.toLowerCase().replace(/[\s-]+/g, "_");

  const isShort =
    n.includes("short_term") ||
    n.includes("shortterm") ||
    n.includes("_st_") ||
    n.startsWith("st_") ||
    n.endsWith("_st");

  if (isShort) return "Short Term";

  const isLong =
    n.includes("long_term") ||
    n.includes("longterm") ||
    n.includes("_lt_") ||
    n.startsWith("lt_") ||
    n.endsWith("_lt");

  if (isLong) return "Long Term";

  return null;
}

/** Effective rental type for template filtering on a conversation. */
export function resolveConversationTemplateRentalType(
  rentalType: unknown,
): ConversationTemplateRentalType {
  const trimmed = String(rentalType ?? "").trim();
  if (trimmed === "Short Term" || trimmed === "Long Term" || trimmed === "General") {
    return trimmed;
  }
  return DEFAULT_CONVERSATION_RENTAL_TYPE;
}

export function filterTemplatesForRentalType(
  templates: Template[],
  rentalType: unknown,
  opts: { channelScoped?: boolean } = {},
): Template[] {
  // When templates were fetched from the conversation's own WABA/channel, the
  // portfolio already scopes which templates exist — name-based rental filtering
  // would hide valid guest templates (e.g. guest_greeting) that lack st_/lt_ markers.
  if (opts.channelScoped) return templates;

  const effective = resolveConversationTemplateRentalType(rentalType);

  if (effective === "General") {
    return templates.filter((t) => classifyTemplateRentalType(t.name) !== "Short Term");
  }

  if (effective === "Short Term") {
    return templates.filter((t) => {
      const classified = classifyTemplateRentalType(t.name);
      // Explicit short-term markers, or unmarked legacy names on the ST WABA.
      return classified === "Short Term" || classified === null;
    });
  }

  // Long Term: explicit long-term markers + legacy unmarked templates
  return templates.filter((t) => {
    const classified = classifyTemplateRentalType(t.name);
    return classified === null || classified === "Long Term";
  });
}

export function isTemplateAllowedForConversationRentalType(
  templateName: string,
  rentalType: unknown,
  opts: { channelScoped?: boolean } = {},
): boolean {
  const stub: Template = {
    name: templateName,
    language: "",
    status: "APPROVED",
    category: "",
    components: [],
  };
  return filterTemplatesForRentalType([stub], rentalType, opts).length > 0;
}

export function filterTemplatesForConversationType(
  templates: Template[],
  conversationType: "owner" | "guest" | undefined,
): Template[] {
  if (!conversationType) return templates;
  return templates.filter((t) => {
    const isOwner = isOwnerWhatsAppTemplateName(t.name);
    return conversationType === "owner" ? isOwner : !isOwner;
  });
}

/** Owner/guest + rental type filters applied in order. */
export function filterTemplatesForConversation(
  templates: Template[],
  opts: {
    conversationType?: "owner" | "guest";
    rentalType?: unknown;
    /** True when templates were loaded from the conversation's WABA/channel. */
    channelScoped?: boolean;
  } = {},
): Template[] {
  const approved = filterApprovedTemplates(templates);
  const byType = filterTemplatesForConversationType(approved, opts.conversationType);
  return filterTemplatesForRentalType(byType, opts.rentalType, {
    channelScoped: opts.channelScoped,
  });
}

export function filterApprovedTemplates(templates: Template[]): Template[] {
  const approved = templates.filter(
    (t) => String(t.status || "").trim().toUpperCase() === "APPROVED",
  );
  return approved.length > 0 ? approved : templates;
}

export function filterTemplatesBySearchQuery(
  templates: Template[],
  query: string,
): Template[] {
  const q = query.trim().toLowerCase();
  if (!q) return templates;
  return templates.filter((t) => {
    const nameMatch = t.name.toLowerCase().includes(q);
    const langMatch = (t.language || "").toLowerCase().includes(q);
    const categoryMatch = (t.category || "").toLowerCase().includes(q);
    const bodySnippet = getTemplateBodySnippet(t).toLowerCase();
    return nameMatch || langMatch || categoryMatch || bodySnippet.includes(q);
  });
}
