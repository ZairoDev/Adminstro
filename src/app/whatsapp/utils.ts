import type { Conversation, Message, Template } from "./types";

export function getMessageDisplayText(message: Message): string {
  if (message.displayText) return message.displayText;

  const content = message.content;
  if (typeof content === "string") return content;

  if (content) {
    if (content.text) return content.text;
    if (content.caption) return content.caption;
    if (content.location) {
      const loc = content.location;
      return `📍 ${loc.name || loc.address || `${loc.latitude}, ${loc.longitude}`}`;
    }
  }

  const typeLabels: Record<string, string> = {
    image: "📷 Image",
    video: "🎬 Video",
    audio: "🎵 Audio",
    document: "📄 Document",
    sticker: "🎨 Sticker",
    interactive: "Interactive message",
    template: "Template message",
  };

  return typeLabels[message.type] || `${message.type} message`;
}

export function getTemplateParameters(
  template: Template
): { type: string; index: number; text: string; example: string; contextSnippet: string }[] {
  const params: { type: string; index: number; text: string; example: string; contextSnippet: string }[] = [];

  template.components?.forEach((component: any) => {
    if (component.type === "BODY" && component.text) {
      const bodyExamples: string[] = component.example?.body_text?.[0] || [];
      const matches = component.text.match(/\{\{(\d+)\}\}/g);
      if (matches) {
        matches.forEach((match: string) => {
          const index = parseInt(match.replace(/[{}]/g, ""));
          const example = bodyExamples[index - 1] || "";
          // Extract surrounding context for the placeholder
          const pos = component.text.indexOf(match);
          const before = component.text.substring(Math.max(0, pos - 25), pos).trim();
          const after = component.text.substring(pos + match.length, pos + match.length + 25).trim();
          const contextSnippet = `${before ? "..." + before + " " : ""}[{{${index}}}]${after ? " " + after + "..." : ""}`;
          params.push({ type: "body", index, text: `Body {{${index}}}`, example, contextSnippet });
        });
      }
    }
    if (component.type === "HEADER" && component.format === "TEXT" && component.text) {
      const headerExamples: string[] = component.example?.header_text || [];
      const matches = component.text.match(/\{\{(\d+)\}\}/g);
      if (matches) {
        matches.forEach((match: string) => {
          const index = parseInt(match.replace(/[{}]/g, ""));
          const example = headerExamples[index - 1] || "";
          const pos = component.text.indexOf(match);
          const before = component.text.substring(Math.max(0, pos - 25), pos).trim();
          const after = component.text.substring(pos + match.length, pos + match.length + 25).trim();
          const contextSnippet = `${before ? "..." + before + " " : ""}[{{${index}}}]${after ? " " + after + "..." : ""}`;
          params.push({ type: "header", index, text: `Header {{${index}}}`, example, contextSnippet });
        });
      }
    }
  });

  return params;
}

/**
 * Extract default/example parameter values from a template.
 * Returns a Record keyed by `type_index` (e.g. "body_1") with example values.
 */
export function getTemplateExampleParams(template: Template): Record<string, string> {
  const defaults: Record<string, string> = {};

  template.components?.forEach((component: any) => {
    if (component.type === "BODY" && component.text) {
      const bodyExamples: string[] = component.example?.body_text?.[0] || [];
      const matches = component.text.match(/\{\{(\d+)\}\}/g);
      if (matches) {
        matches.forEach((match: string) => {
          const index = parseInt(match.replace(/[{}]/g, ""));
          if (bodyExamples[index - 1]) {
            defaults[`body_${index}`] = bodyExamples[index - 1];
          }
        });
      }
    }
    if (component.type === "HEADER" && component.format === "TEXT" && component.text) {
      const headerExamples: string[] = component.example?.header_text || [];
      const matches = component.text.match(/\{\{(\d+)\}\}/g);
      if (matches) {
        matches.forEach((match: string) => {
          const index = parseInt(match.replace(/[{}]/g, ""));
          if (headerExamples[index - 1]) {
            defaults[`header_${index}`] = headerExamples[index - 1];
          }
        });
      }
    }
  });

  return defaults;
}

/**
 * Detects the likely intent of a template parameter from surrounding text.
 * Returns: "recipientName" | "senderName" | "location" | "custom"
 */
export type ParamIntent = "recipientName" | "senderName" | "location" | "custom";

export function detectParamIntent(
  template: Template,
  paramType: string,
  paramIndex: number
): ParamIntent {
  const comp = template.components?.find(
    (c: any) => c.type === (paramType === "header" ? "HEADER" : "BODY")
  );
  if (!comp?.text) return "custom";

  const text = comp.text as string;
  const placeholder = `{{${paramIndex}}}`;
  const pos = text.indexOf(placeholder);
  if (pos === -1) return "custom";

  // Get surrounding text window (50 chars each side, lowered)
  const before = text.substring(Math.max(0, pos - 50), pos).toLowerCase();
  const after = text.substring(pos + placeholder.length, pos + placeholder.length + 50).toLowerCase();

  // Recipient name: greeting patterns
  const recipientNamePatterns = [
    /\b(hi|hello|hey|dear|hola|namaste|welcome)\s*,?\s*$/,
    /\bname\s*[:=]?\s*$/,
    /\bclient\s*$/,
    /\bguest\s*$/,
  ];
  for (const pat of recipientNamePatterns) {
    if (pat.test(before)) return "recipientName";
  }
  // If it's the very first param right after a greeting word
  if (paramIndex === 1 && /\b(hi|hello|hey|dear)\b/.test(before)) return "recipientName";

  // Sender name: closing/attribution patterns
  const senderNamePatterns = [
    /\b(from|regards|by|team|agent|sent by|contact|representative|sincerely)\s*[-:,]?\s*$/,
    /[-–]\s*$/,
  ];
  const senderAfterPatterns = [
    /^\s*(from|team|here|at)\b/,
  ];
  for (const pat of senderNamePatterns) {
    if (pat.test(before)) return "senderName";
  }
  for (const pat of senderAfterPatterns) {
    if (pat.test(after)) return "senderName";
  }

  // Location: place patterns
  const locationPatterns = [
    /\b(in|at|near|around|location|area|city|place|locality|region)\s*[-:,]?\s*$/,
    /\blocation\b/,
  ];
  const locationAfterPatterns = [
    /^\s*(area|location|city|region)\b/,
  ];
  for (const pat of locationPatterns) {
    if (pat.test(before)) return "location";
  }
  for (const pat of locationAfterPatterns) {
    if (pat.test(after)) return "location";
  }

  return "custom";
}

/**
 * For a template, returns a map of param key -> detected intent for all params.
 */
export function getTemplateParamIntents(template: Template): Record<string, ParamIntent> {
  const params = getTemplateParameters(template);
  const intents: Record<string, ParamIntent> = {};
  for (const p of params) {
    intents[`${p.type}_${p.index}`] = detectParamIntent(template, p.type, p.index);
  }
  return intents;
}

/**
 * Build auto-filled params for a template given context.
 * senderName: from token, recipientName/location: placeholder markers for per-send substitution
 */
export function buildAutoFilledParams(
  template: Template,
  senderName: string
): Record<string, string> {
  const intents = getTemplateParamIntents(template);
  const examples = getTemplateExampleParams(template);
  const filled: Record<string, string> = {};

  for (const [key, intent] of Object.entries(intents)) {
    switch (intent) {
      case "senderName":
        filled[key] = senderName || examples[key] || "";
        break;
      case "recipientName":
        // Leave empty - will be filled per-recipient at send time
        filled[key] = "";
        break;
      case "location":
        // Leave empty - will be filled per-recipient at send time
        filled[key] = "";
        break;
      default:
        filled[key] = examples[key] || "";
        break;
    }
  }

  return filled;
}

/**
 * Get a short text summary of a template (first ~80 chars of body text).
 */
export function getTemplateBodySnippet(template: Template): string {
  const bodyComp = template.components?.find((c: any) => c.type === "BODY");
  if (bodyComp?.text) {
    const clean = bodyComp.text.replace(/\{\{\d+\}\}/g, "___");
    return clean.length > 80 ? clean.substring(0, 80) + "..." : clean;
  }
  return "";
}

export function buildTemplateComponents(
  template: Template,
  params: Record<string, string>
): any[] {
  const components: any[] = [];

  const headerParams = Object.entries(params)
    .filter(([key]) => key.startsWith("header_"))
    .sort(([a], [b]) => parseInt(a.split("_")[1]) - parseInt(b.split("_")[1]))
    .map(([_, value]) => ({ type: "text", text: value }));

  if (headerParams.length > 0) {
    components.push({
      type: "header",
      parameters: headerParams,
    });
  }

  const bodyParams = Object.entries(params)
    .filter(([key]) => key.startsWith("body_"))
    .sort(([a], [b]) => parseInt(a.split("_")[1]) - parseInt(b.split("_")[1]))
    .map(([_, value]) => ({ type: "text", text: value }));

  if (bodyParams.length > 0) {
    components.push({
      type: "body",
      parameters: bodyParams,
    });
  }

  return components;
}

// ---- Snapshot-based template context ----------------------------------------

export function getConversationTemplateContext(conversation: Conversation | null): {
  clientName: string;
  locationName: string;
} {
  if (!conversation) {
    return { clientName: "", locationName: "" };
  }

  const clientName = conversation.participantName || conversation.participantPhone;
  const locationName = (conversation as any).participantLocation || "";

  return { clientName, locationName };
}

export function isMessageWindowActive(conversation: Conversation | null): boolean {
  // "You" conversations (internal) are always active - no 24-hour window restriction
  if (conversation?.isInternal || conversation?.source === "internal") {
    return true;
  }
  
  if (!conversation?.lastCustomerMessageAt) return false;
  const lastMessage = new Date(conversation.lastCustomerMessageAt);
  const now = new Date();
  const hoursDiff = (now.getTime() - lastMessage.getTime()) / (1000 * 60 * 60);
  return hoursDiff < 24;
}

export function getRemainingHours(
  conversation: Conversation | null
): { hours: number; minutes: number } | null {
  if (!conversation?.lastCustomerMessageAt) return null;
  const lastMessage = new Date(conversation.lastCustomerMessageAt);
  const now = new Date();
  const msRemaining = lastMessage.getTime() + 24 * 60 * 60 * 1000 - now.getTime();

  if (msRemaining <= 0) return null;

  const hours = Math.floor(msRemaining / (1000 * 60 * 60));
  const minutes = Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60));

  return { hours, minutes };
}

export function getTemplatePreviewText(
  template: Template,
  params: Record<string, string>
): string {
  let previewText = "";

  template.components?.forEach((comp: any) => {
    if (comp.type === "HEADER" && comp.text) {
      let headerText = comp.text;
      const matches = headerText.match(/\{\{(\d+)\}\}/g);
      if (matches) {
        matches.forEach((match: string) => {
          const index = parseInt(match.replace(/[{}]/g, ""));
          headerText = headerText.replace(match, params[`header_${index}`] || match);
        });
      }
      previewText += headerText + "\n\n";
    }
    if (comp.type === "BODY" && comp.text) {
      let bodyText = comp.text;
      const matches = bodyText.match(/\{\{(\d+)\}\}/g);
      if (matches) {
        matches.forEach((match: string) => {
          const index = parseInt(match.replace(/[{}]/g, ""));
          bodyText = bodyText.replace(match, params[`body_${index}`] || match);
        });
      }
      previewText += bodyText;
    }
    if (comp.type === "FOOTER" && comp.text) {
      previewText += "\n\n" + comp.text;
    }
  });

  return previewText || `Template: ${template.name}`;
}

export function formatTime(date: Date | string | undefined) {
  if (!date) return "";
  const d = new Date(date);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return d.toLocaleDateString([], { weekday: "short" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

