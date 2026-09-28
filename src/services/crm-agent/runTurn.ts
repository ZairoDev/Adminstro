import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import mongoose from "mongoose";
import { connectDb } from "@/util/db";
import CrmAgentConversation from "@/models/crmAgentConversation";
import CrmAgentAudit from "@/models/crmAgentAudit";
import {
  CONVERSATION_HISTORY_LIMIT,
  SYSTEM_PROMPT,
  getChatModel,
  requireGoogleApiKey,
} from "@/services/crm-agent/config";
import { classifyIntent } from "@/services/crm-agent/intent";
import {
  formatChunksForPrompt,
  retrieveChunks,
} from "@/services/crm-agent/rag/retrieve";
import { runToolsForIntent } from "@/services/crm-agent/tools";
import type { RunTurnInput, RunTurnResult } from "@/services/crm-agent/types";

function getGeminiProvider() {
  return createGoogleGenerativeAI({ apiKey: requireGoogleApiKey() });
}

export async function runTurn(input: RunTurnInput): Promise<RunTurnResult> {
  const started = Date.now();
  await connectDb();

  const classification = classifyIntent(input.message);
  let conversationId = input.conversationId ?? null;
  let conversation = conversationId
    ? await CrmAgentConversation.findOne({
        _id: conversationId,
        employeeId: input.caller.employeeId,
      })
    : null;

  if (!conversation) {
    conversation = await CrmAgentConversation.create({
      employeeId: new mongoose.Types.ObjectId(input.caller.employeeId),
      title: input.message.slice(0, 80) || "CRM Copilot",
      messages: [],
    });
    conversationId = String(conversation._id);
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
    };
  }

  const needsRag =
    classification.intent === "how_to" ||
    classification.intent === "draft" ||
    (classification.intent === "lookup" && !classification.phone && !classification.vsid);

  let chunks: Awaited<ReturnType<typeof retrieveChunks>> = [];
  if (needsRag || classification.intent === "how_to") {
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
              `Tool ${t.name} ok=${t.ok} summary=${t.summary ?? ""}\n${JSON.stringify(t.data ?? t.error ?? null).slice(0, 4000)}\nLinks: ${(t.deepLinks ?? []).join(", ")}`,
          )
          .join("\n\n");

  const gemini = getGeminiProvider();
  let answer: string;
  try {
    const result = await generateText({
      model: gemini(getChatModel()),
      system: SYSTEM_PROMPT,
      messages: [
        ...history.slice(0, -1),
        {
          role: "user",
          content: `User question:\n${input.message}\n\nKnowledge excerpts:\n${knowledgeBlock}\n\nTool results:\n${toolsBlock}\n\nIntent: ${classification.intent}${proposal ? `\nWrite proposal (requires confirm): ${JSON.stringify(proposal)}` : ""}`,
        },
      ],
    });
    answer = result.text.trim();
  } catch (err) {
    console.error("CRM Copilot LLM failed:", err);
    if (toolResults.some((t) => t.ok && t.data)) {
      answer = toolResults
        .filter((t) => t.ok)
        .map(
          (t) =>
            `**${t.name}**: ${t.summary ?? "ok"}${t.deepLinks?.length ? ` — ${t.deepLinks.join(", ")}` : ""}`,
        )
        .join("\n");
    } else if (chunks.length > 0) {
      answer = `I retrieved knowledge but could not reach the language model. Top source: [${chunks[0].sourcePath}#${chunks[0].heading}].\n\n${chunks[0].content.slice(0, 800)}`;
    } else {
      answer =
        "CRM Copilot could not generate an answer right now (model or knowledge unavailable). Try again or use the dashboard search.";
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
  // Keep conversation from growing unbounded
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
  };
}
