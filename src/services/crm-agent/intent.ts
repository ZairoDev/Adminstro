import type { CrmAgentIntent } from "@/services/crm-agent/types";

const PHONE_RE = /(?:\+?\d[\d\s\-()]{7,}\d)/;
const VSID_RE = /\b(?:VSID|vsid)[:\s#]*([A-Za-z0-9\-]+)\b|\b([A-Z]{2,5}\d{3,})\b/;
const DUMP_RE =
  /ignore (all |previous )?rules|dump all|exfiltrat|bypass (access|auth)|reveal (password|secret|token)/i;

export interface IntentClassification {
  intent: CrmAgentIntent;
  phone?: string;
  vsid?: string;
  financeId?: string;
  conversationHint?: string;
  draftKind?: "whatsapp" | "note" | "email" | "translate";
  proposeKind?: "set_reminder" | "suggest_disposition" | "create_personal_reminder";
}

export function classifyIntent(message: string): IntentClassification {
  const text = message.trim();

  if (DUMP_RE.test(text)) {
    return { intent: "refuse" };
  }

  const phoneMatch = text.match(PHONE_RE);
  const phone = phoneMatch?.[0]?.replace(/[\s\-()]/g, "");

  const vsidMatch = text.match(VSID_RE);
  const vsid = vsidMatch?.[1] || vsidMatch?.[2];

  const lower = text.toLowerCase();

  if (
    /\b(draft|rewrite|polish|translate|rephrase)\b/.test(lower) ||
    /\bwrite (a |an )?(reply|message|note|email)\b/.test(lower)
  ) {
    let draftKind: IntentClassification["draftKind"] = "note";
    if (/\bwhatsapp|wa\b|reply\b/.test(lower)) draftKind = "whatsapp";
    else if (/\bemail\b/.test(lower)) draftKind = "email";
    else if (/\btranslate\b/.test(lower)) draftKind = "translate";
    return { intent: "draft", draftKind, phone, vsid };
  }

  if (
    /\b(set reminder|create reminder|suggest disposition|mark (as )?|propose (to )?)\b/.test(
      lower,
    ) &&
    /\b(confirm|propose|please set|please create|please mark)\b/.test(lower)
  ) {
    let proposeKind: IntentClassification["proposeKind"] = "create_personal_reminder";
    if (/disposition|good.?to.?go|reject|closed/.test(lower)) {
      proposeKind = "suggest_disposition";
    } else if (/lead|query/.test(lower) && /reminder/.test(lower)) {
      proposeKind = "set_reminder";
    }
    return { intent: "propose_write", proposeKind, phone, vsid };
  }

  if (
    /\b(summarize|summary|sum up)\b/.test(lower) &&
    /\b(conversation|thread|chat|whatsapp|inbox)\b/.test(lower)
  ) {
    return { intent: "summarize", phone, conversationHint: text };
  }

  if (
    phone ||
    vsid ||
    /\b(status of|find |lookup |look up |where is|overdue visit|payment (state|status)|invoice |transaction )\b/i.test(
      text,
    ) ||
    /\b(candidate|employee)\b.*\b(search|find|where)\b/i.test(text)
  ) {
    const financeIdMatch = text.match(
      /\b(?:txn|transaction|invoice)[:\s#]*([A-Za-z0-9\-]+)\b/i,
    );
    return {
      intent: "lookup",
      phone,
      vsid,
      financeId: financeIdMatch?.[1],
    };
  }

  if (
    /\b(how (do|can|to)|who can|what does|why (can'?t|cannot)|explain|what is|meaning of|access)\b/i.test(
      text,
    )
  ) {
    return { intent: "how_to", phone, vsid };
  }

  // Default: how_to (RAG) — safest for ambiguous staff questions
  return { intent: "how_to" };
}
