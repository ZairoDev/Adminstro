import { NextRequest, NextResponse } from "next/server";
import { translate } from "@vitalets/google-translate-api";
import { z } from "zod";
import { getDataFromToken } from "@/util/getDataFromToken";

export const dynamic = "force-dynamic";

const translateBodySchema = z.object({
  text: z.string().min(1).max(5000),
  to: z.string().min(2).max(10).optional().default("en"),
  from: z.string().min(2).max(10).optional(),
});

function detectSourceLanguage(raw: {
  ld_result?: { srclangs?: string[] };
}): string {
  const detected = raw.ld_result?.srclangs?.[0];
  return typeof detected === "string" && detected.trim() ? detected.trim() : "auto";
}

export async function POST(req: NextRequest) {
  try {
    await getDataFromToken(req);

    const body = await req.json();
    const parsed = translateBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { text, to, from } = parsed.data;
    const trimmed = text.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const result = await translate(trimmed, {
      from: from ?? "auto",
      to,
    });

    const sourceLanguage = from ?? detectSourceLanguage(result.raw);

    return NextResponse.json({
      success: true,
      text: result.text,
      sourceLanguage,
      targetLanguage: to,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Translation failed";
    console.error("[translate]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
