export type TranslationLanguage = {
  code: string;
  name: string;
};

export type TranslateTextParams = {
  text: string;
  targetLanguageCode: string;
  sourceLanguageCode?: string;
};

export type TranslateTextResult = {
  translatedText: string;
  detectedSourceLanguageCode?: string;
  provider: string;
};

export interface TranslationProvider {
  readonly name: string;
  translate(params: TranslateTextParams): Promise<TranslateTextResult>;
}

/** Major languages for the Translate dialog (ISO 639-1 codes). */
export const SUPPORTED_TRANSLATION_LANGUAGES: TranslationLanguage[] = [
  { code: "en", name: "English" },
  { code: "el", name: "Greek" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "nl", name: "Dutch" },
  { code: "pl", name: "Polish" },
  { code: "ro", name: "Romanian" },
  { code: "ru", name: "Russian" },
  { code: "tr", name: "Turkish" },
  { code: "ar", name: "Arabic" },
  { code: "zh", name: "Chinese" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "hi", name: "Hindi" },
  { code: "uk", name: "Ukrainian" },
  { code: "bg", name: "Bulgarian" },
  { code: "sr", name: "Serbian" },
];
