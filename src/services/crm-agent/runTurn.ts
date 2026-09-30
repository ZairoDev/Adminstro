import { generateText } from "ai";
import { createGroq } from "@ai-sdk/groq";
import mongoose from "mongoose";
import { connectDb } from "@/util/db";
import CrmAgentConversation from "@/models/crmAgentConversation";
import CrmAgentAudit from "@/models/crmAgentAudit";
import {
  CONVERSATION_HISTORY_LIMIT,
  SYSTEM_PROMPT,
  getChatModel,
  requireGroqApiKey,
} from "@/services/crm-agent/config";
import { classifyIntent } from "@/services/crm-agent/intent";
import {
  formatChunksForPrompt,
  retrieveChunks,
} from "@/services/crm-agent/rag/retrieve";
import { runToolsForIntent } from "@/services/crm-agent/tools";
import { processAgentTurn } from "@/services/crm-agent/workflows/engine";
import type { RunTurnInput, RunTurnResult } from "@/services/crm-agent/types";
import type {
  ActiveWorkflow,
  CrmAgentUi,
} from "@/services/crm-agent/workflows/types";

function formatPersonRows(rows: unknown): string {
  if (!Array.isArray(rows) || rows.length === 0) return "";
  return rows
    .slice(0, 5)
    .map((row) => {
      if (!row || typeof row !== "object") return "";
      const r = row as Record<string, unknown>;
      const parts = [
        r.name != null ? `Name: ${String(r.name)}` : null,
        r.role != null ? `Role: ${String(r.role)}` : null,
        r.status != null ? `Status: ${String(r.status)}` : null,
        r.email != null ? `Email: ${String(r.email)}` : null,
        r.phone != null ? `Phone: ${String(r.phone)}` : null,
        r.employeeCode != null ? `Code: ${String(r.employeeCode)}` : null,
        r.allotedArea != null
          ? `Area: ${Array.isArray(r.allotedArea) ? r.allotedArea.join(", ") : String(r.allotedArea)}`
          : null,
        r.isActive != null ? `Active: ${String(r.isActive)}` : null,
      ].filter(Boolean);
      return parts.length ? `• ${parts.join(" · ")}` : "";
    })
    .filter(Boolean)
    .join("\n");
}

function formatToolFallbackAnswer(
  toolResults: Array<{
    name: string;
    ok: boolean;
    data?: unknown;
    summary?: string;
    deepLinks?: string[];
  }>,
): string {
  const blocks: string[] = [
    "The language model was briefly unavailable, so here are the live lookup results:",
  ];

  for (const t of toolResults.filter((r) => r.ok)) {
    const links = t.deepLinks?.length ? ` — ${t.deepLinks.join(", ")}` : "";
    if (t.name === "findEmployee" || t.name === "findCandidate") {
      const rows = Array.isArray(t.data) ? t.data : null;
      const detail = formatPersonRows(rows);
      if (detail) {
        blocks.push(`**${t.name}** (${t.summary ?? "ok"})${links}\n${detail}`);
        continue;
      }
    }
    if (t.data != null && typeof t.data === "object" && !Array.isArray(t.data)) {
      const json = JSON.stringify(t.data).slice(0, 1200);
      blocks.push(`**${t.name}**: ${t.summary ?? "ok"}${links}\n${json}`);
      continue;
    }
    blocks.push(`**${t.name}**: ${t.summary ?? "ok"}${links}`);
  }

  return blocks.join("\n\n");
}

function getGroqProvider() {
  return createGroq({ apiKey: requireGroqApiKey() });
}

function buildReportUiFromTools(
  toolResults: Array<{ name: string; ok: boolean; data?: unknown }>,
): CrmAgentUi | undefined {
  for (const t of toolResults) {
    if (!t.ok || !t.data || typeof t.data !== "object") continue;
    const data = t.data as {
      metrics?: Array<{ label: string; value: string | number; href?: string }>;
      date?: string;
    };
    if (!Array.isArray(data.metrics) || data.metrics.length === 0) continue;

    let title = "Report";
    if (t.name === "getTeamTodayReport") {
      title = `My team today${data.date ? ` · ${data.date}` : ""}`;
    } else if (t.name === "getHiringPipelineSummary") {
      title = "Hiring pipeline";
    } else if (t.name === "getWhatsAppInboxCounts") {
      title = "WhatsApp inbox";
    } else if (t.name === "getDailyLeadStats") {
      title = "Lead stats";
    }
    return { type: "report", title, metrics: data.metrics };
  }
  return undefined;
}

export async function runTurn(input: RunTurnInput): Promise<RunTurnResult> {
  const started = Date.now();
  await connectDb();
  const mode = input.mode ?? "ask";

  const classification = classifyIntent(input.message);
  let conversation = input.conversationId
    ? await CrmAgentConversation.findOne({
        _id: input.conversationId,
        employeeId: input.caller.employeeId,
      })
    : null;

  if (!conversation) {
    conversation = await CrmAgentConversation.create({
      employeeId: new mongoose.Types.ObjectId(input.caller.employeeId),
      title: input.message.slice(0, 80) || "Nova",
      messages: [],
      activeWorkflow: null,
    });
  }

  conversation.messages.push({
    role: "user",
    content: input.message,
    createdAt: new Date(),
  });

  if (classification.intent === "refuse") {
    const answer =
      "I cannot help with requests that try to bypass access rules or dump protected data. Ask a normal CRM how-to or lookup question.";
    conversation.messages.push({
      role: "assistant",
      content: answer,
      createdAt: new Date(),
    });
    conversation.activeWorkflow = null;
    await conversation.save();
    const latencyMs = Date.now() - started;
    await CrmAgentAudit.create({
      actorId: input.caller.employeeId,
      role: input.caller.role,
      conversationId: conversation._id,
      question: input.message.slice(0, 4000),
      intent: "refuse",
      chunkIds: [],
      toolCalls: [],
      latencyMs,
      refused: true,
      refuseReason: "prompt_injection_or_exfil",
    });
    return {
      conversationId: String(conversation._id),
      answer,
      intent: "refuse",
      sources: [],
      toolNames: [],
      proposal: null,
      latencyMs,
      activeWorkflow: null,
    };
  }

  // Agent / Ask workflow branch (slot fill, plans, reports)
  const wfResult = await processAgentTurn({
    mode,
    message: input.message,
    caller: input.caller,
    callerEmail: input.callerEmail,
    activeWorkflow: (conversation.activeWorkflow as ActiveWorkflow | null) ?? null,
  });

  if (wfResult) {
    conversation.activeWorkflow = wfResult.activeWorkflow;
    conversation.messages.push({
      role: "assistant",
      content: wfResult.answer,
      createdAt: new Date(),
    });
    if (conversation.messages.length > 40) {
      conversation.messages = conversation.messages.slice(-40);
    }
    await conversation.save();
    const latencyMs = Date.now() - started;
    const intent =
      wfResult.reportOnly
        ? "how_to"
        : wfResult.activeWorkflow?.status === "awaiting_confirm"
          ? "propose_write"
          : mode === "agent"
            ? "propose_write"
            : "how_to";
    await CrmAgentAudit.create({
      actorId: input.caller.employeeId,
      role: input.caller.role,
      conversationId: conversation._id,
      question: input.message.slice(0, 4000),
      intent,
      chunkIds: [],
      toolCalls: wfResult.activeWorkflow
        ? [
            {
              name: `workflow:${wfResult.activeWorkflow.workflowId}`,
              ok: true,
              summary: wfResult.activeWorkflow.status,
            },
          ]
        : [],
      latencyMs,
      refused: false,
    });
    return {
      conversationId: String(conversation._id),
      answer: wfResult.answer,
      intent,
      sources: [],
      toolNames: [],
      proposal: null,
      latencyMs,
      activeWorkflow: wfResult.activeWorkflow,
      ui: wfResult.ui,
    };
  }

  const needsRag =
    classification.intent === "how_to"
    || classification.intent === "draft"
    || classification.intent === "report"
    || (classification.intent === "lookup"
      && !classification.phone
      && !classification.vsid);

  let chunks: Awaited<ReturnType<typeof retrieveChunks>> = [];
  if (needsRag) {
    try {
      chunks = await retrieveChunks(input.message);
    } catch (err) {
      console.error("CRM Copilot RAG retrieve failed:", err);
      chunks = [];
    }
  }

  const { results: toolResults, proposal } = await runToolsForIntent(
    input.caller,
    classification,
    input.message,
    input.callerEmail,
  );

  const reportUi = buildReportUiFromTools(toolResults);

  const history = conversation.messages
    .slice(-CONVERSATION_HISTORY_LIMIT)
    .map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    }));

  const knowledgeBlock = formatChunksForPrompt(chunks);
  const toolsBlock =
    toolResults.length === 0
      ? "No tools were called."
      : toolResults
          .map(
            (t) =>
              `Tool ${t.name} ok=${t.ok} summary=${t.summary ?? ""}\n${JSON.stringify(t.data ?? t.error ?? null).slice(0, 8000)}\nLinks: ${(t.deepLinks ?? []).join(", ")}`,
          )
          .join("\n\n");

  const groq = getGroqProvider();
  const chatModel = getChatModel();
  let answer: string;
  try {
    const result = await generateText({
      model: groq(chatModel),
      system: SYSTEM_PROMPT,
      messages: [
        ...history.slice(0, -1),
        {
          role: "user",
          content: `User question:\n${input.message}\n\nKnowledge excerpts:\n${knowledgeBlock}\n\nTool results (use every useful non-sensitive field):\n${toolsBlock}\n\nIntent: ${classification.intent}${proposal ? `\nWrite proposal (requires confirm): ${JSON.stringify(proposal)}` : ""}`,
        },
      ],
    });
    answer = result.text.trim();
  } catch (err) {
    console.error(`CRM Copilot LLM failed (model=${chatModel}):`, err);
    if (toolResults.some((t) => t.ok && t.data != null)) {
      answer = formatToolFallbackAnswer(toolResults);
    } else if (chunks.length > 0) {
      answer = `I retrieved knowledge but could not reach the language model. Top source: [${chunks[0].sourcePath}#${chunks[0].heading}].\n\n${chunks[0].content.slice(0, 800)}`;
    } else {
      answer =
        "Nova could not generate an answer right now (model or knowledge unavailable). Try again or use the dashboard search.";
    }
  }

  const sources = chunks.map((c) => ({
    sourcePath: c.sourcePath,
    heading: c.heading,
  }));
  const toolNames = toolResults.map((t) => t.name);

  conversation.messages.push({
    role: "assistant",
    content: answer,
    sources,
    toolNames,
    createdAt: new Date(),
  });
  if (conversation.messages.length > 40) {
    conversation.messages = conversation.messages.slice(-40);
  }
  await conversation.save();

  const latencyMs = Date.now() - started;
  await CrmAgentAudit.create({
    actorId: input.caller.employeeId,
    role: input.caller.role,
    conversationId: conversation._id,
    question: input.message.slice(0, 4000),
    intent: classification.intent,
    chunkIds: chunks.map((c) => c.id),
    toolCalls: toolResults.map((t) => ({
      name: t.name,
      ok: t.ok,
      summary: t.summary,
    })),
    latencyMs,
    refused: false,
  });

  return {
    conversationId: String(conversation._id),
    answer,
    intent: classification.intent,
    sources,
    toolNames,
    proposal: proposal ?? null,
    latencyMs,
    activeWorkflow: (conversation.activeWorkflow as ActiveWorkflow | null) ?? null,
    ui: reportUi,
  };
}
