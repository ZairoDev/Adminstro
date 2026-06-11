import { OpenAiTranslationProvider } from "./providers/openAiTranslationProvider";
import type {
  TranslateTextParams,
  TranslateTextResult,
  TranslationProvider,
} from "./types";

let cachedProvider: TranslationProvider | null = null;

export function getTranslationProvider(): TranslationProvider {
  if (!cachedProvider) {
    cachedProvider = new OpenAiTranslationProvider();
  }
  return cachedProvider;
}

export async function translateMessageText(
  params: TranslateTextParams,
): Promise<TranslateTextResult> {
  const text = params.text?.trim();
  if (!text) {
    throw new Error("Text is required");
  }
  if (!params.targetLanguageCode?.trim()) {
    throw new Error("Target language is required");
  }

  return getTranslationProvider().translate({
    ...params,
    text,
    targetLanguageCode: params.targetLanguageCode.trim().toLowerCase(),
    sourceLanguageCode: params.sourceLanguageCode?.trim().toLowerCase(),
  });
}
