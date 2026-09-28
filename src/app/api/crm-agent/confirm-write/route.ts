import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import { assertAgentAccess, canUseTool } from "@/services/crm-agent/guards/access";
import type { CrmAgentCaller } from "@/services/crm-agent/types";
import CrmAgentAudit from "@/models/crmAgentAudit";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  type: z.enum([
    "set_reminder",
    "suggest_disposition",
    "create_personal_reminder",
  ]),
  payload: z.record(z.unknown()),
  confirmed: z.literal(true),
});

/**
 * Phase 4 confirm-to-write endpoint.
 * Executes only after the client sends confirmed: true.
 * Reminder creation is implemented; disposition delegates to existing sales APIs via documented next step.
 */
export async function POST(request: NextRequest) {
  try {
    const token = await getDataFromToken(request);
    const caller: CrmAgentCaller = {
      employeeId: String(token.id),
      role: String(token.role ?? ""),
    };

    const access = assertAgentAccess(caller);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status },
      );
    }
    if (!canUseTool("proposeWrite", caller.role)) {
      return NextResponse.json(
        { error: "Role cannot confirm writes" },
        { status: 403 },
      );
    }

    const parsed = BodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body — confirmed:true required" },
        { status: 400 },
      );
    }

    await connectDb();
    const { type, payload } = parsed.data;

    if (type === "create_personal_reminder") {
      const PersonalReminder = (await import("@/models/personalReminder"))
        .default;
      const note =
        typeof payload.note === "string"
          ? payload.note
          : typeof payload.rawRequest === "string"
            ? payload.rawRequest
            : "Reminder from CRM Copilot";
      const scheduledAt =
        typeof payload.scheduledAt === "string"
          ? new Date(payload.scheduledAt)
          : new Date(Date.now() + 60 * 60 * 1000);

      const doc = await PersonalReminder.create({
        employeeId: caller.employeeId,
        title:
          typeof payload.title === "string"
            ? payload.title.slice(0, 200)
            : "Copilot reminder",
        note: note.slice(0, 2000),
        scheduledAt,
        status: "pending",
      });

      await CrmAgentAudit.create({
        actorId: caller.employeeId,
        role: caller.role,
        question: `confirm-write:${type}`,
        intent: "propose_write",
        chunkIds: [],
        toolCalls: [
          {
            name: "confirmWrite",
            ok: true,
            summary: `personal_reminder:${String(doc._id)}`,
          },
        ],
        latencyMs: 0,
        refused: false,
      });

      return NextResponse.json({
        success: true,
        type,
        id: String(doc._id),
        deepLink: "/dashboard/my-reminders",
      });
    }

    // Disposition / lead reminder: return structured instruction to use existing UI/API
    // rather than inventing a second write path.
    return NextResponse.json({
      success: true,
      type,
      deferred: true,
      message:
        type === "suggest_disposition"
          ? "Open the lead in createquery and apply the disposition there, or call the existing disposition API with the proposed status."
          : "Open the lead and set the reminder in the lead UI.",
      payload,
      deepLinks: ["/dashboard/createquery", "/dashboard/reminders"],
    });
  } catch (err: unknown) {
    const error = err as { status?: number; code?: string; message?: string };
    if (error?.status === 401 || error?.code) {
      return NextResponse.json(
        { error: error.message || "Unauthorized", code: error.code },
        { status: error.status || 401 },
      );
    }
    console.error("CRM Copilot confirm-write error:", err);
    return NextResponse.json(
      { error: "Failed to confirm write" },
      { status: 500 },
    );
  }
}
