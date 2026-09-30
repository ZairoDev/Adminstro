import type { CrmAgentIntent } from "@/services/crm-agent/types";

const PHONE_RE = /(?:\+?\d[\d\s\-()]{7,}\d)/;
const VSID_RE =
  /\b(?:VSID|vsid)[:\s#]*([A-Za-z0-9\-]+)\b|\b([A-Z]{2,5}\d{3,})\b/;
const DUMP_RE =
  /ignore (all |previous )?rules|dump all|exfiltrat|bypass (access|auth)|reveal (password|secret|token)/i;

/** Stop-words that mean "who is" is not a person name lookup. */
const WHO_IS_NON_PERSON =
  /^(a |an |the )?(vsid|good.?to.?go|pip|query|offer|lead|visit|booking|reminder|whatsapp|finance|copilot)\b/i;

export interface IntentClassification {
  intent: CrmAgentIntent;
  phone?: string;
  vsid?: string;
  financeId?: string;
  conversationHint?: string;
  /** General person search (employee and/or candidate). */
  personHint?: string;
  /** @deprecated prefer personHint — kept for callers that still set it */
  employeeHint?: string;
  draftKind?: "whatsapp" | "note" | "email" | "translate";
  proposeKind?:
    | "set_reminder"
    | "suggest_disposition"
    | "create_personal_reminder";
}

function looksLikeReport(lower: string): boolean {
  return (
    /\bmy\s+team\s+today\b/.test(lower)
    || /\bteam\s+today\b/.test(lower)
    || /\bhiring\s+(update|pipeline|funnel|today)\b/.test(lower)
    || /\bcandidate\s+(pipeline|funnel|stats|counts?)\b/.test(lower)
    || /\blead\s+stats?\b/.test(lower)
    || /\btoday'?s?\s+(lead|visit|hiring|team)\b/.test(lower)
    || /\bwhat'?s\s+new\b/.test(lower)
    || /\b(status|pipeline)\s+counts?\b/.test(lower)
    || /\bhow\s+many\s+(leads?|candidates?|visits?|reminders?)\b/.test(lower)
    || /\binbox\s+(count|backlog|stats?)\b/.test(lower)
    || /\bfinance\s+overview\b/.test(lower)
    || /\b(my\s+)?reminders?\s+(due|today|list)\b/.test(lower)
    || /\breport\b/.test(lower)
  );
}

function extractPersonHint(text: string): string | undefined {
  const whoIs = text.match(
    /\bwho\s+is\s+([A-Za-z][A-Za-z.\s\-']{1,60}?)\s*\??$/i,
  );
  if (whoIs?.[1] && !WHO_IS_NON_PERSON.test(whoIs[1].trim())) {
    return whoIs[1].trim();
  }

  const findPerson = text.match(
    /\b(?:find|lookup|look\s+up)\s+(?:employee|staff|candidate|person)?\s*([A-Za-z][A-Za-z.\s\-']{1,60})$/i,
  );
  if (findPerson?.[1] && !WHO_IS_NON_PERSON.test(findPerson[1].trim())) {
    const name = findPerson[1].trim();
    // Avoid treating "find lead by phone" style as a person name
    if (!/\b(lead|phone|property|visit|offer|vsid)\b/i.test(name)) {
      return name;
    }
  }

  const staff = text.match(
    /\b(?:employee|staff|candidate)\s+([A-Za-z][A-Za-z.\s\-']{1,60})$/i,
  );
  if (staff?.[1] && !WHO_IS_NON_PERSON.test(staff[1].trim())) {
    return staff[1].trim();
  }

  return undefined;
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
    /\b(draft|rewrite|polish|translate|rephrase)\b/.test(lower)
    || /\bwrite (a |an )?(reply|message|note|email)\b/.test(lower)
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
    )
    && /\b(confirm|propose|please set|please create|please mark)\b/.test(lower)
  ) {
    let proposeKind: IntentClassification["proposeKind"] =
      "create_personal_reminder";
    if (/disposition|good.?to.?go|reject|closed/.test(lower)) {
      proposeKind = "suggest_disposition";
    } else if (/lead|query/.test(lower) && /reminder/.test(lower)) {
      proposeKind = "set_reminder";
    }
    return { intent: "propose_write", proposeKind, phone, vsid };
  }

  if (
    /\b(summarize|summary|sum up)\b/.test(lower)
    && /\b(conversation|thread|chat|whatsapp|inbox)\b/.test(lower)
  ) {
    return { intent: "summarize", phone, conversationHint: text };
  }

  if (looksLikeReport(lower)) {
    return { intent: "report", phone, vsid };
  }

  const personHint = extractPersonHint(text);
  if (personHint) {
    return {
      intent: "lookup",
      phone,
      vsid,
      personHint,
      employeeHint: personHint,
    };
  }

  if (
    phone
    || vsid
    || /\b(status of|find |lookup |look up |where is|overdue visit|payment (state|status)|invoice |transaction )\b/i.test(
      text,
    )
    || /\b(candidate|employee)\b.*\b(search|find|where)\b/i.test(text)
  ) {
    const financeIdMatch = text.match(
      /\b(?:txn|transaction|invoice)[:\s#]*([A-Za-z0-9\-]+)\b/i,
    );
    return {
      intent: "lookup",
      phone,
      vsid,
      financeId: financeIdMatch?.[1],
      personHint: /\b(employee|candidate|staff)\b/i.test(text)
        ? text
        : undefined,
      employeeHint: /\bemployee\b/i.test(text) ? text : undefined,
    };
  }

  if (
    /\b(how (do|can|to)|who can|what does|why (can'?t|cannot)|explain|what is|meaning of|access)\b/i.test(
      text,
    )
  ) {
    return { intent: "how_to", phone, vsid };
  }

  return { intent: "how_to" };
}
