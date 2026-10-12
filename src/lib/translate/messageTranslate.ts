import type { Message } from "@/app/whatsapp/types";
import { getMessageDisplayText } from "@/app/whatsapp/utils";

export type MessageTranslationEntry = {
  originalText: string;
  sourceLanguage: string;
  englishText: string;
  showing: "original" | "english";
};

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  el: "Greek",
  it: "Italian",
  de: "German",
  fr: "French",
  es: "Spanish",
  pt: "Portuguese",
  tr: "Turkish",
  ar: "Arabic",
  ru: "Russian",
  hi: "Hindi",
  auto: "Original",
};

export function getLanguageLabel(code: string): string {
  const key = code.toLowerCase().split("-")[0];
  return LANGUAGE_LABELS[key] ?? code.toUpperCase();
}

/** Text that can be sent to the translate API (body or media caption). */
export function getTranslatableMessageText(message: Message): string | null {
  const content = message.content;

  if (typeof content === "object" && content !== null) {
    const caption = content.caption?.trim();
    if (caption) return caption;
    const text = content.text?.trim();
    if (text) return text;
  }

  if (typeof content === "string" && content.trim()) {
    return content.trim();
  }

  if (message.type === "text") {
    const display = getMessageDisplayText(message).trim();
    if (!display || /^[📷🎬🎵📄🎨📍]/.test(display)) return null;
    return display;
  }

  return null;
}

export function isTranslatableMessage(message: Message): boolean {
  const text = getTranslatableMessageText(message);
  return Boolean(text && text.length >= 1);
}

export function getMessageTranslationDisplayText(
  message: Message,
  entry: MessageTranslationEntry | undefined,
): string {
  const fallback = getTranslatableMessageText(message) ?? getMessageDisplayText(message);
  if (!entry) return fallback;
  return entry.showing === "english" ? entry.englishText : entry.originalText;
}
