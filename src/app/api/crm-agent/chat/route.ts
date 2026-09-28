import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDataFromToken } from "@/util/getDataFromToken";
import { assertAgentAccess } from "@/services/crm-agent/guards/access";
import { checkRateLimit } from "@/services/crm-agent/guards/rateLimit";
import { runTurn } from "@/services/crm-agent/runTurn";
import type { CrmAgentCaller } from "@/services/crm-agent/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BodySchema = z.object({
  message: z.string().trim().min(1).max(4000),
  conversationId: z.string().trim().optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const token = await getDataFromToken(request);
    const caller: CrmAgentCaller = {
      employeeId: String(token.id),
      role: String(token.role ?? ""),
      name: typeof token.name === "string" ? token.name : undefined,
      allotedArea: (token as { allotedArea?: string[] | string }).allotedArea,
      uiFlags: (token as { uiFlags?: CrmAgentCaller["uiFlags"] }).uiFlags,
      whatsappPhoneMask: (
        token as { whatsappPhoneMask?: CrmAgentCaller["whatsappPhoneMask"] }
      ).whatsappPhoneMask,
    };

    const access = assertAgentAccess(caller);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status },
      );
    }

    const rate = checkRateLimit(caller.employeeId);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          retryAfterMs: rate.retryAfterMs,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(rate.retryAfterMs / 1000)),
          },
        },
      );
    }

    const parsed = BodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const result = await runTurn({
      message: parsed.data.message,
      conversationId: parsed.data.conversationId,
      caller,
      callerEmail: typeof token.email === "string" ? token.email : undefined,
    });

    return NextResponse.json({
      success: true,
      ...result,
      rateLimitRemaining: rate.remaining,
    });
  } catch (err: unknown) {
    const error = err as { status?: number; code?: string; message?: string };
    if (error?.status === 401 || error?.code) {
      return NextResponse.json(
        { error: error.message || "Unauthorized", code: error.code },
        { status: error.status || 401 },
      );
    }
    console.error("CRM Copilot chat error:", err);
    return NextResponse.json(
      { error: "Failed to process chat turn" },
      { status: 500 },
    );
  }
}
