import Query from "@/models/query";
import { Properties } from "@/models/property";
import Users from "@/models/user";
import { Owners } from "@/models/owner";
import { Offer } from "@/models/offer";
import Candidate from "@/models/candidate";
import { connectDb } from "@/util/db";
import { getOverdueVisitsForUser } from "@/services/visits/visitService";
import { computePlatformAvailability } from "@/util/salesOfferLookup";
import {
  canUseTool,
  sanitizeToolData,
  type ToolName,
} from "@/services/crm-agent/guards/access";
import type { IntentClassification } from "@/services/crm-agent/intent";
import type {
  CrmAgentCaller,
  ToolResult,
  WriteProposal,
} from "@/services/crm-agent/types";
import {
  WHATSAPP_SUMMARY_MESSAGE_LIMIT,
  getPilotRoles,
} from "@/services/crm-agent/config";

function deny(tool: ToolName, role: string): ToolResult {
  return {
    name: tool,
    ok: false,
    error: `Role ${role} cannot use tool ${tool}`,
    summary: "access_denied",
  };
}

export async function findLeadByPhone(
  caller: CrmAgentCaller,
  phone: string,
): Promise<ToolResult> {
  const name: ToolName = "findLeadByPhone";
  if (!canUseTool(name, caller.role)) return deny(name, caller.role);
  await connectDb();
  const lead = await Query.findOne({
    phoneNo: { $regex: phone.replace(/\D/g, "").slice(-10) || phone, $options: "i" },
  })
    .select(
      "_id name phoneNo email leadStatus createdBy location area propertyType budget note createdAt updatedAt",
    )
    .lean();

  if (!lead) {
    return {
      name,
      ok: true,
      data: null,
      summary: "Lead not found",
      deepLinks: ["/dashboard/createquery"],
    };
  }

  const data = sanitizeToolData(name, lead, caller);
  return {
    name,
    ok: true,
    data,
    summary: `Lead ${(lead as { leadStatus?: string }).leadStatus ?? "unknown"}`,
    deepLinks: [
      `/dashboard/createquery/${String((lead as { _id: unknown })._id)}`,
    ],
  };
}

export async function findPropertyByVsid(
  caller: CrmAgentCaller,
  vsid: string,
): Promise<ToolResult> {
  const name: ToolName = "findPropertyByVsid";
  if (!canUseTool(name, caller.role)) return deny(name, caller.role);
  await connectDb();
  const property = await Properties.findOne(
    { VSID: vsid },
    {
      _id: 1,
      VSID: 1,
      email: 1,
      street: 1,
      city: 1,
      state: 1,
      country: 1,
      phone: 1,
      userId: 1,
    },
  ).lean();

  if (!property) {
    return {
      name,
      ok: true,
      data: null,
      summary: "Property not found",
      deepLinks: ["/dashboard/property"],
    };
  }

  let owner: { name?: string; email?: string; phone?: string } | null = null;
  try {
    const userId = (property as { userId?: string }).userId;
    if (userId) {
      const ownerDoc = await Users.findById(userId)
        .select("name email phone")
        .lean<{ name?: string; email?: string; phone?: string } | null>();
      owner = ownerDoc;
    }
  } catch {
    owner = null;
  }

  const data = sanitizeToolData(
    name,
    { ...property, owner },
    caller,
  );
  return {
    name,
    ok: true,
    data,
    summary: `Property ${vsid} found`,
    deepLinks: [`/dashboard/property`],
  };
}

export async function findOwnerByPhone(
  caller: CrmAgentCaller,
  phone: string,
): Promise<ToolResult> {
  const name: ToolName = "findOwnerByPhone";
  if (!canUseTool(name, caller.role)) return deny(name, caller.role);
  await connectDb();
  const existing = await Owners.findOne({ phoneNumber: phone })
    .select("_id phoneNumber name email")
    .lean();
  return {
    name,
    ok: true,
    data: sanitizeToolData(
      name,
      { exists: Boolean(existing), owner: existing },
      caller,
    ),
    summary: existing ? "Owner exists" : "Owner not found",
    deepLinks: ["/dashboard/owners", "/spreadsheet"],
  };
}

export async function findOfferByPhone(
  caller: CrmAgentCaller,
  phone: string,
): Promise<ToolResult> {
  const name: ToolName = "findOfferByPhone";
  if (!canUseTool(name, caller.role)) return deny(name, caller.role);
  await connectDb();
  const matches = await Offer.find({ phoneNumber: phone })
    .sort({ createdAt: -1 })
    .select(
      "_id phoneNumber email name propertyName leadStatus offerStatus leadStage platform organization createdAt",
    )
    .limit(5)
    .lean();
  const availability = computePlatformAvailability(
    matches.map((o) => ({
      platform: typeof o.platform === "string" ? o.platform : undefined,
    })),
  );
  return {
    name,
    ok: true,
    data: sanitizeToolData(
      name,
      { ...availability, matches },
      caller,
    ),
    summary: matches.length
      ? `${matches.length} offer(s) found`
      : "No offers for this phone",
    deepLinks: ["/dashboard/sales-offer"],
  };
}

export async function getOverdueVisitsTool(
  caller: CrmAgentCaller,
  email?: string,
): Promise<ToolResult> {
  const name: ToolName = "getOverdueVisits";
  if (!canUseTool(name, caller.role)) return deny(name, caller.role);
  if (!email) {
    return {
      name,
      ok: false,
      error: "Caller email required for overdue visits",
      summary: "missing_email",
    };
  }
  const visits = await getOverdueVisitsForUser(email);
  return {
    name,
    ok: true,
    data: sanitizeToolData(
      name,
      {
        count: visits.length,
        visits: visits.slice(0, 20),
      },
      caller,
    ),
    summary: `${visits.length} overdue visit(s)`,
    deepLinks: ["/dashboard/visits"],
  };
}

export async function findCandidateTool(
  caller: CrmAgentCaller,
  search: string,
): Promise<ToolResult> {
  const name: ToolName = "findCandidate";
  if (!canUseTool(name, caller.role)) return deny(name, caller.role);
  await connectDb();
  const q = search.trim();
  const results = await Candidate.find({
    $or: [
      { name: { $regex: q, $options: "i" } },
      { email: { $regex: q, $options: "i" } },
      { phone: { $regex: q, $options: "i" } },
    ],
  })
    .select(
      "_id name email phone position status employeeId exitedAt createdAt",
    )
    .limit(10)
    .lean();

  return {
    name,
    ok: true,
    data: sanitizeToolData(name, results, caller),
    summary: `${results.length} candidate(s)`,
    deepLinks: results[0]
      ? [`/dashboard/people/${String(results[0]._id)}`]
      : ["/dashboard/people"],
  };
}

export function explainMyAccess(caller: CrmAgentCaller): ToolResult {
  const name: ToolName = "explainMyAccess";
  return {
    name,
    ok: true,
    data: {
      role: caller.role,
      pilotRoles: getPilotRoles(),
      allotedArea: caller.allotedArea ?? null,
      uiFlags: caller.uiFlags ?? null,
      note: "Full route matrix is in docs/crm-agent/playbooks/roles-access.md. SuperAdmin has broad dashboard access; other roles are limited by middleware roleAccess.",
    },
    summary: `Access for ${caller.role}`,
    deepLinks: ["/dashboard"],
  };
}

export async function searchWhatsAppTool(
  caller: CrmAgentCaller,
  query: string,
): Promise<ToolResult> {
  const name: ToolName = "searchWhatsApp";
  if (!canUseTool(name, caller.role)) return deny(name, caller.role);

  try {
    const WhatsAppConversation = (
      await import("@/models/whatsappConversation")
    ).default;
    await connectDb();
    const digits = query.replace(/\D/g, "");
    const convos = await WhatsAppConversation.find(
      digits.length >= 6
        ? {
            $or: [
              { wa_id: { $regex: digits.slice(-10), $options: "i" } },
              { "contact.name": { $regex: query, $options: "i" } },
            ],
          }
        : { "contact.name": { $regex: query, $options: "i" } },
    )
      .select("_id wa_id contact.name lastMessageAt")
      .sort({ lastMessageAt: -1 })
      .limit(10)
      .lean();

    return {
      name,
      ok: true,
      data: sanitizeToolData(name, convos, caller),
      summary: `${convos.length} conversation(s)`,
      deepLinks: ["/whatsapp"],
    };
  } catch (err) {
    return {
      name,
      ok: false,
      error: err instanceof Error ? err.message : "WhatsApp search failed",
      summary: "search_failed",
    };
  }
}

export async function getConversationSummaryTool(
  caller: CrmAgentCaller,
  conversationIdOrPhone: string,
): Promise<ToolResult> {
  const name: ToolName = "getConversationSummary";
  if (!canUseTool(name, caller.role)) return deny(name, caller.role);
  try {
    await connectDb();
    const WhatsAppConversation = (
      await import("@/models/whatsappConversation")
    ).default;
    const WhatsAppMessage = (await import("@/models/whatsappMessage")).default;

    const digits = conversationIdOrPhone.replace(/\D/g, "");
    const convo = await WhatsAppConversation.findOne(
      digits.length >= 8
        ? { wa_id: { $regex: digits.slice(-10), $options: "i" } }
        : { _id: conversationIdOrPhone },
    )
      .select("_id wa_id contact.name")
      .lean();

    if (!convo) {
      return {
        name,
        ok: true,
        data: null,
        summary: "Conversation not found",
        deepLinks: ["/whatsapp"],
      };
    }

    const convoDoc = convo as { _id: unknown; contact?: { name?: string } };
    const messages = await WhatsAppMessage.find({
      conversationId: convoDoc._id,
    })
      .sort({ timestamp: -1 })
      .limit(WHATSAPP_SUMMARY_MESSAGE_LIMIT)
      .select("direction body text type timestamp")
      .lean();

    const chronological = [...messages].reverse().map((m) => ({
      direction: (m as { direction?: string }).direction,
      text:
        (m as { body?: string; text?: string }).body ||
        (m as { text?: string }).text ||
        "",
      timestamp: (m as { timestamp?: Date }).timestamp,
    }));

    return {
      name,
      ok: true,
      data: sanitizeToolData(
        name,
        {
          conversationId: String(convoDoc._id),
          contact: convoDoc.contact?.name,
          messages: chronological,
        },
        caller,
      ),
      summary: `${chronological.length} message(s) loaded for summary`,
      deepLinks: [`/whatsapp`],
    };
  } catch (err) {
    return {
      name,
      ok: false,
      error: err instanceof Error ? err.message : "Failed to load conversation",
      summary: "load_failed",
    };
  }
}

export async function getFinanceTransactionTool(
  caller: CrmAgentCaller,
  id: string,
): Promise<ToolResult> {
  const name: ToolName = "getFinanceTransaction";
  if (!canUseTool(name, caller.role)) return deny(name, caller.role);
  try {
    await connectDb();
    const FinancePayment = (await import("@/models/financePayment")).default;
    const doc = await FinancePayment.findById(id)
      .select(
        "_id amount status currency paymentId customerName customerPhone createdAt updatedAt",
      )
      .lean();
    if (!doc) {
      return {
        name,
        ok: true,
        data: null,
        summary: "Transaction not found",
        deepLinks: ["/dashboard/finance/transactions"],
      };
    }
    return {
      name,
      ok: true,
      data: sanitizeToolData(name, doc, caller),
      summary: `Transaction status ${(doc as { status?: string }).status}`,
      deepLinks: [`/dashboard/finance/transactions/${id}`],
    };
  } catch (err) {
    return {
      name,
      ok: false,
      error: err instanceof Error ? err.message : "Finance lookup failed",
      summary: "finance_failed",
    };
  }
}

export async function getFinanceOverviewTool(
  caller: CrmAgentCaller,
): Promise<ToolResult> {
  const name: ToolName = "getFinanceOverview";
  if (!canUseTool(name, caller.role)) return deny(name, caller.role);
  return {
    name,
    ok: true,
    data: {
      note: "Open /dashboard/finance for live aggregates. Copilot does not invent totals — use the finance overview UI or pass a transaction id.",
    },
    summary: "Finance overview pointer",
    deepLinks: ["/dashboard/finance"],
  };
}

export async function getWebhookLogHintTool(
  caller: CrmAgentCaller,
  hint: string,
): Promise<ToolResult> {
  const name: ToolName = "getWebhookLogHint";
  if (!canUseTool(name, caller.role)) return deny(name, caller.role);
  try {
    await connectDb();
    const RazorpayWebhookLog = (await import("@/models/razorpayWebhookLog"))
      .default;
    const logs = await RazorpayWebhookLog.find({
      $or: [
        { event: { $regex: hint, $options: "i" } },
        { "payload.id": hint },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("_id event status createdAt")
      .lean();
    return {
      name,
      ok: true,
      data: sanitizeToolData(name, logs, caller),
      summary: `${logs.length} webhook log(s)`,
      deepLinks: ["/dashboard/finance/webhook-logs"],
    };
  } catch (err) {
    return {
      name,
      ok: false,
      error: err instanceof Error ? err.message : "Webhook log lookup failed",
      summary: "webhook_failed",
    };
  }
}

export function draftTextTool(
  caller: CrmAgentCaller,
  kind: string,
  message: string,
): ToolResult {
  const name: ToolName = "draftText";
  if (!canUseTool(name, caller.role)) return deny(name, caller.role);
  return {
    name,
    ok: true,
    data: {
      kind,
      instruction: message,
      note: "Compose a draft only. Do not send WhatsApp, email, or save to CRM. Staff must copy and send manually.",
    },
    summary: `Draft request (${kind})`,
  };
}

export function proposeWriteTool(
  caller: CrmAgentCaller,
  kind: NonNullable<IntentClassification["proposeKind"]>,
  message: string,
  phone?: string,
): { result: ToolResult; proposal: WriteProposal } {
  const name: ToolName = "proposeWrite";
  if (!canUseTool(name, caller.role)) {
    return {
      result: {
        name,
        ok: false,
        error: `Role ${caller.role} cannot propose writes`,
        summary: "access_denied",
      },
      proposal: {
        type: "create_personal_reminder",
        title: "Denied",
        description: "Not allowed",
        payload: {},
        confirmApi: "",
      },
    };
  }

  const proposal: WriteProposal = {
    type: kind,
    title:
      kind === "suggest_disposition"
        ? "Suggest lead disposition"
        : kind === "set_reminder"
          ? "Set lead reminder"
          : "Create personal reminder",
    description: message,
    payload: {
      phone: phone ?? null,
      rawRequest: message,
      proposedBy: caller.employeeId,
    },
    confirmApi: "/api/crm-agent/confirm-write",
  };

  return {
    result: {
      name,
      ok: true,
      data: proposal,
      summary: `Write proposal: ${kind} (requires human confirm)`,
      deepLinks: phone ? ["/dashboard/createquery"] : ["/dashboard/my-reminders"],
    },
    proposal,
  };
}

export async function runToolsForIntent(
  caller: CrmAgentCaller,
  classification: IntentClassification,
  message: string,
  callerEmail?: string,
): Promise<{ results: ToolResult[]; proposal?: WriteProposal | null }> {
  const results: ToolResult[] = [];
  let proposal: WriteProposal | null = null;

  if (classification.intent === "refuse") {
    return { results, proposal: null };
  }

  if (classification.intent === "how_to") {
    if (/\b(access|who can|role|permission|open)\b/i.test(message)) {
      results.push(explainMyAccess(caller));
    }
    return { results, proposal: null };
  }

  if (classification.intent === "draft") {
    results.push(
      draftTextTool(caller, classification.draftKind ?? "note", message),
    );
    return { results, proposal: null };
  }

  if (classification.intent === "propose_write") {
    const { result, proposal: p } = proposeWriteTool(
      caller,
      classification.proposeKind ?? "create_personal_reminder",
      message,
      classification.phone,
    );
    results.push(result);
    if (result.ok) proposal = p;
    return { results, proposal };
  }

  if (classification.intent === "summarize") {
    const hint = classification.phone || classification.conversationHint || message;
    results.push(await getConversationSummaryTool(caller, hint));
    return { results, proposal: null };
  }

  // lookup
  if (classification.phone) {
    results.push(await findLeadByPhone(caller, classification.phone));
    results.push(await findOfferByPhone(caller, classification.phone));
    results.push(await findOwnerByPhone(caller, classification.phone));
  }
  if (classification.vsid) {
    results.push(await findPropertyByVsid(caller, classification.vsid));
  }
  if (/\boverdue\b/i.test(message) && /\bvisit/i.test(message)) {
    results.push(await getOverdueVisitsTool(caller, callerEmail));
  }
  if (/\bcandidate\b/i.test(message) || /\bhr\b/i.test(message)) {
    const search =
      classification.phone ||
      message.replace(/\b(find|search|candidate|where is)\b/gi, "").trim();
    if (search.length >= 2) {
      results.push(await findCandidateTool(caller, search));
    }
  }
  if (/\bwhatsapp|inbox|conversation\b/i.test(message)) {
    results.push(
      await searchWhatsAppTool(
        caller,
        classification.phone || message,
      ),
    );
  }
  if (classification.financeId || /\b(transaction|invoice|payment)\b/i.test(message)) {
    if (classification.financeId) {
      results.push(
        await getFinanceTransactionTool(caller, classification.financeId),
      );
    } else if (/\boverview|finance dashboard\b/i.test(message)) {
      results.push(await getFinanceOverviewTool(caller));
    }
    if (/\bwebhook\b/i.test(message)) {
      results.push(await getWebhookLogHintTool(caller, message));
    }
  }
  if (/\b(my access|who can|permissions?)\b/i.test(message)) {
    results.push(explainMyAccess(caller));
  }

  return { results, proposal };
}
