import type { Template } from "@/app/whatsapp/types";
import { getTemplateBodySnippet } from "@/app/whatsapp/utils";

/** Matches backend conversationType rules (conversations route, send-template). */
export function isOwnerWhatsAppTemplateName(templateName: string): boolean {
  const n = templateName.toLowerCase();
  return n.includes("owners_template") || n.startsWith("owner");
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
