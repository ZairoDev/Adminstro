import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDataFromToken } from "@/util/getDataFromToken";
import { isWhatsAppAccessRole } from "@/lib/whatsapp/config";
import { translateMessageText } from "@/lib/whatsapp/translation/translationService";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  text: z.string().min(1).max(4096),
  targetLanguageCode: z.string().min(2).max(10),
  sourceLanguageCode: z.string().min(2).max(10).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const token = await getDataFromToken(req) as { role?: string };
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!isWhatsAppAccessRole(token.role || "") && token.role !== "Advert") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const result = await translateMessageText(parsed.data);
    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Translation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
