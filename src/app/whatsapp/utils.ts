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
): { type: string; index: number; text: string }[] {
  const params: { type: string; index: number; text: string }[] = [];

  template.components?.forEach((component: any) => {
    if (component.type === "BODY" && component.text) {
      const matches = component.text.match(/\{\{(\d+)\}\}/g);
      if (matches) {
        matches.forEach((match: string) => {
          const index = parseInt(match.replace(/[{}]/g, ""));
          params.push({ type: "body", index, text: `Body Parameter ${index}` });
        });
      }
    }
    if (component.type === "HEADER" && component.format === "TEXT" && component.text) {
      const matches = component.text.match(/\{\{(\d+)\}\}/g);
      if (matches) {
        matches.forEach((match: string) => {
          const index = parseInt(match.replace(/[{}]/g, ""));
          params.push({ type: "header", index, text: `Header Parameter ${index}` });
        });
      }
    }
  });

  return params;
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

export function isMessageWindowActive(conversation: Conversation | null): boolean {
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

