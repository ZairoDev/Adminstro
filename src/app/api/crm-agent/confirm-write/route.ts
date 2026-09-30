import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import {
  assertAgentAccess,
  canRunAgentWriteWorkflow,
} from "@/services/crm-agent/guards/access";
import type { CrmAgentCaller } from "@/services/crm-agent/types";
import CrmAgentAudit from "@/models/crmAgentAudit";
import CrmAgentConversation from "@/models/crmAgentConversation";
import { applyLeadDisposition } from "@/services/leads/applyLeadDisposition";
import type { ActiveWorkflow } from "@/services/crm-agent/workflows/types";
import type { CoreWhatsAppDispositionAction } from "@/lib/leads/leadDisposition";
import Query from "@/models/query";
import PersonalReminder from "@/models/personalReminder";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  conversationId: z.string().min(1),
  confirmed: z.boolean(),
});

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

    const parsed = BodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body — conversationId and confirmed required" },
        { status: 400 },
      );
    }

    await connectDb();
    const conversation = await CrmAgentConversation.findOne({
      _id: parsed.data.conversationId,
      employeeId: caller.employeeId,
    });
    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    const workflow = conversation.activeWorkflow as ActiveWorkflow | null;
    if (!workflow || workflow.status !== "awaiting_confirm") {
      return NextResponse.json(
        { error: "No workflow awaiting confirmation" },
        { status: 400 },
      );
    }

    if (!parsed.data.confirmed) {
      conversation.activeWorkflow = null;
      conversation.messages.push({
        role: "assistant",
        content: "Cancelled.",
        createdAt: new Date(),
      });
      await conversation.save();
      return NextResponse.json({ success: true, cancelled: true });
    }

    if (!canRunAgentWriteWorkflow(caller.role)) {
      return NextResponse.json(
        { error: "Role cannot confirm Agent writes" },
        { status: 403 },
      );
    }

    if (workflow.workflowId === "apply_disposition") {
      const slots = workflow.slots;
      const leadId = String(slots.leadId ?? "");
      const action = slots.action as CoreWhatsAppDispositionAction;
      const result = await applyLeadDisposition({
        leadId,
        action,
        leadQualityByReviewer: String(slots.leadQualityByReviewer ?? ""),
        reason: typeof slots.reason === "string" ? slots.reason : undefined,
        actorEmployeeId: caller.employeeId,
      });

      conversation.activeWorkflow = null;
      const deepLink =
        result.afterStatus === "active"
          ? "/dashboard/goodtogoleads"
          : `/dashboard/createquery/${result.leadId}`;
      const answer = `Done. Lead moved ${result.beforeStatus} → ${result.afterStatus}. Open ${deepLink}`;
      conversation.messages.push({
        role: "assistant",
        content: answer,
        createdAt: new Date(),
      });
      await conversation.save();

      await CrmAgentAudit.create({
        actorId: caller.employeeId,
        role: caller.role,
        conversationId: conversation._id,
        question: `confirm-write:apply_disposition`,
        intent: "propose_write",
        chunkIds: [],
        toolCalls: [
          {
            name: "applyLeadDisposition",
            ok: true,
            summary: `${result.beforeStatus}->${result.afterStatus}:${result.leadId}`,
          },
        ],
        latencyMs: 0,
        refused: false,
      });

      return NextResponse.json({
        success: true,
        type: "apply_disposition",
        ...result,
        deepLink,
        answer,
      });
    }

    if (workflow.workflowId === "set_reminder") {
      const slots = workflow.slots;
      const target = String(slots.target ?? "personal");
      const scheduledAt = new Date(String(slots.scheduledAt));
      const note = String(slots.note ?? "Reminder from Nova");

      if (Number.isNaN(scheduledAt.getTime())) {
        return NextResponse.json(
          { error: "Invalid scheduledAt" },
          { status: 400 },
        );
      }

      if (target === "lead") {
        const leadId = String(slots.leadId ?? "");
        if (!mongoose.Types.ObjectId.isValid(leadId)) {
          return NextResponse.json({ error: "Invalid leadId" }, { status: 400 });
        }
        await Query.findByIdAndUpdate(leadId, {
          $set: {
            leadStatus: "reminder",
            reminder: scheduledAt,
            reason: scheduledAt.toISOString(),
          },
        });
        const deepLink = `/dashboard/createquery/${leadId}`;
        const answer = `Lead reminder set for ${scheduledAt.toISOString()}. ${deepLink}`;
        conversation.activeWorkflow = null;
        conversation.messages.push({
          role: "assistant",
          content: answer,
          createdAt: new Date(),
        });
        await conversation.save();
        await CrmAgentAudit.create({
          actorId: caller.employeeId,
          role: caller.role,
          conversationId: conversation._id,
          question: "confirm-write:set_reminder:lead",
          intent: "propose_write",
          chunkIds: [],
          toolCalls: [
            {
              name: "setLeadReminder",
              ok: true,
              summary: leadId,
            },
          ],
          latencyMs: 0,
          refused: false,
        });
        return NextResponse.json({
          success: true,
          type: "set_reminder",
          target: "lead",
          leadId,
          deepLink,
          answer,
        });
      }

      const doc = await PersonalReminder.create({
        employeeId: caller.employeeId,
        title: "Copilot reminder",
        note: note.slice(0, 2000),
        scheduledAt,
        status: "pending",
      });
      const deepLink = "/dashboard/my-reminders";
      const answer = `Personal reminder created. Open ${deepLink}`;
      conversation.activeWorkflow = null;
      conversation.messages.push({
        role: "assistant",
        content: answer,
        createdAt: new Date(),
      });
      await conversation.save();
      await CrmAgentAudit.create({
        actorId: caller.employeeId,
        role: caller.role,
        conversationId: conversation._id,
        question: "confirm-write:set_reminder:personal",
        intent: "propose_write",
        chunkIds: [],
        toolCalls: [
          {
            name: "createPersonalReminder",
            ok: true,
            summary: String(doc._id),
          },
        ],
        latencyMs: 0,
        refused: false,
      });
      return NextResponse.json({
        success: true,
        type: "set_reminder",
        target: "personal",
        id: String(doc._id),
        deepLink,
        answer,
      });
    }

    return NextResponse.json(
      { error: `Unsupported workflow ${workflow.workflowId}` },
      { status: 400 },
    );
  } catch (err: unknown) {
    const error = err as { status?: number; code?: string; message?: string };
    if (error?.status === 401 || error?.code) {
      return NextResponse.json(
        { error: error.message || "Unauthorized", code: error.code },
        { status: error.status || 401 },
      );
    }
    if (error?.status === 400 || error?.status === 404) {
      return NextResponse.json(
        { error: error.message || "Bad request" },
        { status: error.status },
      );
    }
    console.error("CRM Copilot confirm-write error:", err);
    return NextResponse.json(
      { error: error?.message || "Failed to confirm write" },
      { status: 500 },
    );
  }
}
