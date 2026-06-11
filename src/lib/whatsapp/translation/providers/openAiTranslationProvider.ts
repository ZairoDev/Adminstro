import type {
  TranslateTextParams,
  TranslateTextResult,
  TranslationProvider,
} from "../types";

/**
 * OpenAI-backed translation — swap providers without changing API/UI layers.
 */
export class OpenAiTranslationProvider implements TranslationProvider {
  readonly name = "openai";

  async translate(params: TranslateTextParams): Promise<TranslateTextResult> {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("Translation is not configured (missing OPENAI_API_KEY)");
    }

    const model = process.env.OPENAI_TRANSLATION_MODEL?.trim() || "gpt-4o-mini";
    const target = params.targetLanguageCode;
    const sourceHint = params.sourceLanguageCode
      ? ` from ${params.sourceLanguageCode}`
      : "";

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "You are a professional translator for vacation rental customer support. Return ONLY the translated text with no quotes or explanation.",
          },
          {
            role: "user",
            content: `Translate the following message${sourceHint} into language code "${target}":\n\n${params.text}`,
          },
        ],
      }),
    });

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    };

    if (!response.ok) {
      throw new Error(data.error?.message || "Translation provider error");
    }

    const translatedText = data.choices?.[0]?.message?.content?.trim();
    if (!translatedText) {
      throw new Error("Empty translation response");
    }

    return {
      translatedText,
      detectedSourceLanguageCode: params.sourceLanguageCode,
      provider: this.name,
    };
  }
}
