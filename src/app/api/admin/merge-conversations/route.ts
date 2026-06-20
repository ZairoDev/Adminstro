import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import {
  findDuplicateConversationGroups,
  mergeDuplicateConversationGroups,
} from "@/lib/whatsapp/conversationMergeService";

export const dynamic = "force-dynamic";

connectDb();

const mergeBodySchema = z.object({
  groupKeys: z.array(z.string()).optional().default([]),
  confirmText: z.literal("MERGE CONFIRMED"),
});

async function requireSuperAdmin(req: NextRequest): Promise<NextResponse | null> {
  const token = (await getDataFromToken(req)) as { role?: string } | null;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (token.role !== "SuperAdmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

/**
 * GET /api/admin/merge-conversations
 * SuperAdmin only: dry-run scan for duplicate WhatsApp conversations.
 */
export async function GET(req: NextRequest) {
  try {
    const denied = await requireSuperAdmin(req);
    if (denied) return denied;

    const result = await findDuplicateConversationGroups();
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[merge-conversations GET]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/admin/merge-conversations
 * SuperAdmin only: merge selected duplicate conversation groups.
 */
export async function POST(req: NextRequest) {
  try {
    const denied = await requireSuperAdmin(req);
    if (denied) return denied;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = mergeBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            "Safety confirmation required. Send confirmText: 'MERGE CONFIRMED'",
        },
        { status: 400 },
      );
    }

    const result = await mergeDuplicateConversationGroups(parsed.data.groupKeys);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[merge-conversations POST]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
