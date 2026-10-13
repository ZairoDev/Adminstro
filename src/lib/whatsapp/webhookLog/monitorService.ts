import type { Types } from "mongoose";
import { connectDb } from "@/util/db";
import WhatsAppWebhookLog, {
  type WhatsAppWebhookLogKind,
  type WhatsAppWebhookProcessingStatus,
  type WhatsAppWebhookSignatureStatus,
} from "@/models/whatsappWebhookLog";
import WhatsAppMessage from "@/models/whatsappMessage";
import WhatsAppConversation from "@/models/whatsappConversation";
import Employee from "@/models/employee";

const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

/** A handler normally finishes in seconds; older "pending" rows mean it died / was rejected. */
const STALE_PENDING_MS = 3 * MINUTE_MS;
const MAX_READ_CANDIDATES = 5000;
const MAX_INBOUND_LOG_ROWS = 100_000;

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/** Last 10 digits — tolerant to country-code / leading-zero differences. */
function phoneKey(value: string | undefined | null): string {
  const digits = digitsOnly(value ?? "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function iso(value: Date | string | undefined | null): string | undefined {
  return value ? new Date(value).toISOString() : undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// Logs listing
// ─────────────────────────────────────────────────────────────────────────────

export type WebhookLogListParams = {
  days: number;
  page: number;
  limit: number;
  kind?: WhatsAppWebhookLogKind;
  processingStatus?: WhatsAppWebhookProcessingStatus;
  signatureStatus?: WhatsAppWebhookSignatureStatus;
  /** Digits; matched on the last 10 digits */
  phone?: string;
  messageId?: string;
  businessPhoneId?: string;
};

export type WebhookLogListRow = {
  id: string;
  receivedAt: string;
  eventAt?: string;
  field: string;
  kind: string;
  status?: string;
  messageId?: string;
  businessPhoneId?: string;
  customerPhone?: string;
  messageType?: string;
  preview?: string;
  signatureStatus?: string;
  processingStatus?: string;
  processingReason?: string;
  processingError?: string;
  processedAt?: string;
  conversationId?: string;
  eligibleUserCount?: number;
  socketEmittedCount?: number;
  /** Inbound rows still "pending" after STALE_PENDING_MS — handler never finished */
  stalePending: boolean;
  payload?: Record<string, unknown>;
};

export type WebhookLogListResult = {
  rows: WebhookLogListRow[];
  total: number;
  page: number;
  totalPages: number;
};

type WebhookLogLean = {
  _id: Types.ObjectId;
  receivedAt: Date;
  eventAt?: Date;
  field: string;
  kind: string;
  status?: string;
  messageId?: string;
  businessPhoneId?: string;
  customerPhone?: string;
  messageType?: string;
  preview?: string;
  signatureStatus?: string;
  processingStatus?: string;
  processingReason?: string;
  processingError?: string;
  processedAt?: Date;
  conversationId?: string;
  eligibleUserCount?: number;
  socketEmittedCount?: number;
  payload?: Record<string, unknown>;
};

export async function listWebhookLogs(
  params: WebhookLogListParams,
): Promise<WebhookLogListResult> {
  await connectDb();

  const since = new Date(Date.now() - params.days * DAY_MS);
  const filter: Record<string, unknown> = { receivedAt: { $gte: since } };

  if (params.kind) filter.kind = params.kind;
  if (params.processingStatus) filter.processingStatus = params.processingStatus;
  if (params.signatureStatus) filter.signatureStatus = params.signatureStatus;
  if (params.messageId) filter.messageId = params.messageId;
  if (params.businessPhoneId) filter.businessPhoneId = params.businessPhoneId;
  if (params.phone) {
    const key = phoneKey(params.phone);
    if (key) filter.customerPhone = { $regex: `${key}$` };
  }

  const [total, docs] = await Promise.all([
    WhatsAppWebhookLog.countDocuments(filter),
    WhatsAppWebhookLog.find(filter)
      .sort({ receivedAt: -1 })
      .skip((params.page - 1) * params.limit)
      .limit(params.limit)
      .lean<WebhookLogLean[]>(),
  ]);

  const staleCutoff = Date.now() - STALE_PENDING_MS;

  return {
    total,
    page: params.page,
    totalPages: Math.max(1, Math.ceil(total / params.limit)),
    rows: docs.map((d) => ({
      id: String(d._id),
      receivedAt: new Date(d.receivedAt).toISOString(),
      eventAt: iso(d.eventAt),
      field: d.field,
      kind: d.kind,
      status: d.status,
      messageId: d.messageId,
      businessPhoneId: d.businessPhoneId,
      customerPhone: d.customerPhone,
      messageType: d.messageType,
      preview: d.preview,
      signatureStatus: d.signatureStatus,
      processingStatus: d.processingStatus,
      processingReason: d.processingReason,
      processingError: d.processingError,
      processedAt: iso(d.processedAt),
      conversationId: d.conversationId,
      eligibleUserCount: d.eligibleUserCount,
      socketEmittedCount: d.socketEmittedCount,
      stalePending:
        d.kind === "inbound_message" &&
        d.processingStatus === "pending" &&
        new Date(d.receivedAt).getTime() < staleCutoff,
      payload: d.payload,
    })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary / health
// ─────────────────────────────────────────────────────────────────────────────

export type WebhookMonitorSummary = {
  since: string;
  /** When the earliest retained log row was written — logs before this don't exist. */
  coverageStartedAt?: string;
  lastWebhookAt?: string;
  lastInboundAt?: string;
  byKind: Record<string, number>;
  inboundTotal: number;
  inboundByProcessing: Record<string, number>;
  /** inbound rows pending longer than 3 min (handler died or delivery rejected) */
  inboundStalePending: number;
  invalidSignatureCount: number;
  /** distinct customers whose inbound was NOT stored (dropped / error / stale pending) */
  customersWithLostInbound: number;
  /** inbound saved but no employee was notified (no socket/push) */
  savedWithoutNotification: number;
  dropReasons: Array<{ reason: string; count: number }>;
};

export async function getWebhookMonitorSummary(
  days: number,
): Promise<WebhookMonitorSummary> {
  await connectDb();

  const since = new Date(Date.now() - days * DAY_MS);
  const staleCutoff = new Date(Date.now() - STALE_PENDING_MS);
  const base = { receivedAt: { $gte: since } };
  const inboundBase = { ...base, kind: "inbound_message" };

  const lostFilter = {
    ...inboundBase,
    $or: [
      { processingStatus: { $in: ["dropped", "error"] } },
      { processingStatus: "pending", receivedAt: { $gte: since, $lt: staleCutoff } },
    ],
  };

  const [
    firstRow,
    lastRow,
    lastInbound,
    kindAgg,
    processingAgg,
    stalePending,
    invalidSignatureCount,
    lostCustomers,
    savedWithoutNotification,
    reasonAgg,
  ] = await Promise.all([
    WhatsAppWebhookLog.findOne({})
      .sort({ receivedAt: 1 })
      .select("receivedAt")
      .lean<{ receivedAt: Date } | null>(),
    WhatsAppWebhookLog.findOne({})
      .sort({ receivedAt: -1 })
      .select("receivedAt")
      .lean<{ receivedAt: Date } | null>(),
    WhatsAppWebhookLog.findOne({ kind: "inbound_message" })
      .sort({ receivedAt: -1 })
      .select("receivedAt")
      .lean<{ receivedAt: Date } | null>(),
    WhatsAppWebhookLog.aggregate<{ _id: string; count: number }>([
      { $match: base },
      { $group: { _id: "$kind", count: { $sum: 1 } } },
    ]),
    WhatsAppWebhookLog.aggregate<{ _id: string | null; count: number }>([
      { $match: inboundBase },
      { $group: { _id: "$processingStatus", count: { $sum: 1 } } },
    ]),
    WhatsAppWebhookLog.countDocuments({
      ...inboundBase,
      processingStatus: "pending",
      receivedAt: { $gte: since, $lt: staleCutoff },
    }),
    WhatsAppWebhookLog.countDocuments({ ...base, signatureStatus: "invalid" }),
    WhatsAppWebhookLog.distinct("customerPhone", lostFilter),
    WhatsAppWebhookLog.countDocuments({
      ...inboundBase,
      processingStatus: "saved",
      processingReason: /^saved_no_notification/,
    }),
    WhatsAppWebhookLog.aggregate<{ _id: string | null; count: number }>([
      {
        $match: {
          ...inboundBase,
          processingStatus: { $in: ["dropped", "error"] },
        },
      },
      { $group: { _id: "$processingReason", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
  ]);

  const byKind: Record<string, number> = {};
  for (const row of kindAgg) if (row._id) byKind[row._id] = row.count;

  const inboundByProcessing: Record<string, number> = {};
  let inboundTotal = 0;
  for (const row of processingAgg) {
    inboundByProcessing[row._id ?? "unknown"] = row.count;
    inboundTotal += row.count;
  }

  return {
    since: since.toISOString(),
    coverageStartedAt: iso(firstRow?.receivedAt),
    lastWebhookAt: iso(lastRow?.receivedAt),
    lastInboundAt: iso(lastInbound?.receivedAt),
    byKind,
    inboundTotal,
    inboundByProcessing,
    inboundStalePending: stalePending,
    invalidSignatureCount,
    customersWithLostInbound: lostCustomers.filter(Boolean).length,
    savedWithoutNotification,
    dropReasons: reasonAgg.map((r) => ({
      reason: r._id ?? "unknown",
      count: r.count,
    })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Read but not replied
// ─────────────────────────────────────────────────────────────────────────────

export type ReadNotRepliedVerdict =
  /** Meta sent us the customer's message but we did not store it → real bug */
  | "webhook_received_not_stored"
  /** Customer replied on another conversation (other line / duplicate chat) */
  | "replied_on_other_conversation"
  /** Meta never sent an inbound webhook for this number since the read */
  | "no_inbound_webhook"
  /** The read happened before webhook logging existed — cannot tell */
  | "no_log_coverage";

export type ReadNotRepliedParams = {
  days: number;
  /** Only include messages read at least this long ago (gives the customer time to answer) */
  minAgeMinutes: number;
  page: number;
  limit: number;
  verdict?: ReadNotRepliedVerdict;
  phone?: string;
};

export type LostInboundEntry = {
  messageId?: string;
  receivedAt: string;
  preview?: string;
  processingStatus?: string;
  reason?: string;
  signatureStatus?: string;
};

export type ReadNotRepliedRow = {
  conversationId: string;
  phone: string;
  name?: string;
  location?: string;
  conversationType?: string;
  businessPhoneId: string;
  assignedAgentName?: string;
  lastReadMessage: {
    messageId: string;
    type: string;
    templateName?: string;
    preview?: string;
    sentAt: string;
    readAt: string;
  };
  readMessageCount: number;
  verdict: ReadNotRepliedVerdict;
  lostInbound: LostInboundEntry[];
  otherConversation?: {
    conversationId: string;
    businessPhoneId?: string;
    lastIncomingAt: string;
  };
};

export type ReadNotRepliedResult = {
  rows: ReadNotRepliedRow[];
  total: number;
  page: number;
  totalPages: number;
  verdictCounts: Record<ReadNotRepliedVerdict, number>;
  coverageStartedAt?: string;
  generatedAt: string;
  truncated: boolean;
};

type ReadGroup = {
  _id: Types.ObjectId;
  messageId: string;
  businessPhoneId?: string;
  to?: string;
  type: string;
  templateName?: string;
  text?: string;
  caption?: string;
  sentAt: Date;
  readAt: Date;
  readMessageCount: number;
};

type LastIncoming = { _id: Types.ObjectId; lastIncomingAt: Date };

type ConversationLean = {
  _id: Types.ObjectId;
  participantPhone: string;
  participantName?: string;
  participantLocation?: string;
  conversationType?: string;
  businessPhoneId?: string;
  assignedAgent?: Types.ObjectId;
};

type InboundLogLean = {
  customerPhone?: string;
  eventAt?: Date;
  receivedAt: Date;
  messageId?: string;
  preview?: string;
  processingStatus?: string;
  processingReason?: string;
  signatureStatus?: string;
};

const VERDICT_PRIORITY: Record<ReadNotRepliedVerdict, number> = {
  webhook_received_not_stored: 0,
  replied_on_other_conversation: 1,
  no_inbound_webhook: 2,
  no_log_coverage: 3,
};

function isNotStored(row: InboundLogLean, staleCutoff: number): boolean {
  if (row.signatureStatus === "invalid") return true;
  if (row.processingStatus === "dropped" || row.processingStatus === "error") {
    return true;
  }
  return (
    row.processingStatus === "pending" &&
    new Date(row.receivedAt).getTime() < staleCutoff
  );
}

/**
 * Customers whose last outbound message was READ (Meta read receipt) with no
 * customer message afterwards, cross-checked against the raw webhook log so we
 * can tell "customer really did not reply" apart from "reply reached us but
 * was not stored".
 */
export async function getReadButNotReplied(
  params: ReadNotRepliedParams,
): Promise<ReadNotRepliedResult> {
  await connectDb();

  const now = Date.now();
  const since = new Date(now - params.days * DAY_MS);
  const readCutoff = new Date(now - params.minAgeMinutes * MINUTE_MS);
  const staleCutoff = now - STALE_PENDING_MS;

  // 1. Latest read outbound message per conversation.
  const groups = await WhatsAppMessage.aggregate<ReadGroup>([
    {
      $match: {
        direction: "outgoing",
        source: { $ne: "internal" },
        timestamp: { $gte: since },
        statusEvents: {
          $elemMatch: { status: "read", timestamp: { $lte: readCutoff } },
        },
      },
    },
    {
      $addFields: {
        readAt: {
          $min: {
            $map: {
              input: {
                $filter: {
                  input: "$statusEvents",
                  as: "e",
                  cond: { $eq: ["$$e.status", "read"] },
                },
              },
              as: "e",
              in: "$$e.timestamp",
            },
          },
        },
      },
    },
    { $sort: { timestamp: -1 } },
    {
      $group: {
        _id: "$conversationId",
        messageId: { $first: "$messageId" },
        businessPhoneId: { $first: "$businessPhoneId" },
        to: { $first: "$to" },
        type: { $first: "$type" },
        templateName: { $first: "$templateName" },
        text: { $first: "$content.text" },
        caption: { $first: "$content.caption" },
        sentAt: { $first: "$timestamp" },
        readAt: { $first: "$readAt" },
        readMessageCount: { $sum: 1 },
      },
    },
    { $sort: { sentAt: -1 } },
    { $limit: MAX_READ_CANDIDATES },
  ]);

  const truncated = groups.length >= MAX_READ_CANDIDATES;
  const emptyCounts: Record<ReadNotRepliedVerdict, number> = {
    webhook_received_not_stored: 0,
    replied_on_other_conversation: 0,
    no_inbound_webhook: 0,
    no_log_coverage: 0,
  };

  const earliestLog = await WhatsAppWebhookLog.findOne({
    kind: "inbound_message",
  })
    .sort({ receivedAt: 1 })
    .select("receivedAt")
    .lean<{ receivedAt: Date } | null>();
  const coverageStartedAt = earliestLog
    ? new Date(earliestLog.receivedAt)
    : undefined;

  if (groups.length === 0) {
    return {
      rows: [],
      total: 0,
      page: params.page,
      totalPages: 1,
      verdictCounts: emptyCounts,
      coverageStartedAt: iso(coverageStartedAt),
      generatedAt: new Date(now).toISOString(),
      truncated,
    };
  }

  // 2. Drop conversations where the customer already wrote after our message (in DB).
  const groupIds = groups.map((g) => g._id);
  const incoming = await WhatsAppMessage.aggregate<LastIncoming>([
    {
      $match: {
        conversationId: { $in: groupIds },
        direction: "incoming",
        type: { $ne: "reaction" },
      },
    },
    { $group: { _id: "$conversationId", lastIncomingAt: { $max: "$timestamp" } } },
  ]);
  const lastIncomingByConv = new Map(
    incoming.map((i) => [String(i._id), new Date(i.lastIncomingAt).getTime()]),
  );

  const unreplied = groups.filter((g) => {
    const last = lastIncomingByConv.get(String(g._id));
    return last === undefined || last < new Date(g.sentAt).getTime();
  });

  if (unreplied.length === 0) {
    return {
      rows: [],
      total: 0,
      page: params.page,
      totalPages: 1,
      verdictCounts: emptyCounts,
      coverageStartedAt: iso(coverageStartedAt),
      generatedAt: new Date(now).toISOString(),
      truncated,
    };
  }

  // 3. Conversation metadata (skip internal / merged chats).
  const conversations = await WhatsAppConversation.find({
    _id: { $in: unreplied.map((g) => g._id) },
    source: { $ne: "internal" },
    status: { $ne: "merged" },
  })
    .select(
      "participantPhone participantName participantLocation conversationType businessPhoneId assignedAgent",
    )
    .lean<ConversationLean[]>();
  const convById = new Map(conversations.map((c) => [String(c._id), c]));

  const candidates = unreplied
    .map((g) => ({ group: g, conv: convById.get(String(g._id)) }))
    .filter(
      (c): c is { group: ReadGroup; conv: ConversationLean } => Boolean(c.conv),
    )
    .filter((c) => {
      if (!params.phone) return true;
      const wanted = phoneKey(params.phone);
      return wanted ? phoneKey(c.conv.participantPhone).endsWith(wanted) : true;
    });

  // 4. Replies stored under a different conversation for the same phone.
  const phones = [...new Set(candidates.map((c) => c.conv.participantPhone))];
  const candidateIds = candidates.map((c) => c.conv._id);
  const otherConvs = phones.length
    ? await WhatsAppConversation.find({
        participantPhone: { $in: phones },
        _id: { $nin: candidateIds },
        source: { $ne: "internal" },
      })
        .select("participantPhone businessPhoneId")
        .lean<Array<{ _id: Types.ObjectId; participantPhone: string; businessPhoneId?: string }>>()
    : [];

  const otherIncoming = otherConvs.length
    ? await WhatsAppMessage.aggregate<LastIncoming>([
        {
          $match: {
            conversationId: { $in: otherConvs.map((c) => c._id) },
            direction: "incoming",
            type: { $ne: "reaction" },
          },
        },
        {
          $group: {
            _id: "$conversationId",
            lastIncomingAt: { $max: "$timestamp" },
          },
        },
      ])
    : [];
  const otherIncomingByConv = new Map(
    otherIncoming.map((i) => [String(i._id), new Date(i.lastIncomingAt)]),
  );
  const otherByPhone = new Map<
    string,
    Array<{ conversationId: string; businessPhoneId?: string; lastIncomingAt: Date }>
  >();
  for (const oc of otherConvs) {
    const last = otherIncomingByConv.get(String(oc._id));
    if (!last) continue;
    const list = otherByPhone.get(oc.participantPhone) ?? [];
    list.push({
      conversationId: String(oc._id),
      businessPhoneId: oc.businessPhoneId,
      lastIncomingAt: last,
    });
    otherByPhone.set(oc.participantPhone, list);
  }

  // 5. Raw inbound webhook rows (bucketed by last-10-digits of the customer phone).
  const earliestSent = candidates.reduce(
    (min, c) => Math.min(min, new Date(c.group.sentAt).getTime()),
    Number.POSITIVE_INFINITY,
  );
  const inboundLogs = candidates.length
    ? await WhatsAppWebhookLog.find({
        kind: "inbound_message",
        receivedAt: { $gte: new Date(earliestSent - 5 * MINUTE_MS) },
      })
        .sort({ receivedAt: -1 })
        .limit(MAX_INBOUND_LOG_ROWS)
        .select(
          "customerPhone eventAt receivedAt messageId preview processingStatus processingReason signatureStatus",
        )
        .lean<InboundLogLean[]>()
    : [];
  const logsByPhone = new Map<string, InboundLogLean[]>();
  for (const row of inboundLogs) {
    const key = phoneKey(row.customerPhone);
    if (!key) continue;
    const list = logsByPhone.get(key) ?? [];
    list.push(row);
    logsByPhone.set(key, list);
  }

  // 6. Agent names.
  const agentIds = [
    ...new Set(
      candidates
        .map((c) => (c.conv.assignedAgent ? String(c.conv.assignedAgent) : ""))
        .filter(Boolean),
    ),
  ];
  const agents = agentIds.length
    ? await Employee.find({ _id: { $in: agentIds } })
        .select("name")
        .lean<Array<{ _id: Types.ObjectId; name?: string }>>()
    : [];
  const agentNameById = new Map(agents.map((a) => [String(a._id), a.name]));

  // 7. Verdict per customer.
  const verdictCounts = { ...emptyCounts };
  const allRows: ReadNotRepliedRow[] = candidates.map(({ group, conv }) => {
    const sentAtMs = new Date(group.sentAt).getTime();
    const readAtMs = new Date(group.readAt).getTime();

    const inboundAfter = (logsByPhone.get(phoneKey(conv.participantPhone)) ?? []).filter(
      (row) => {
        const t = new Date(row.eventAt ?? row.receivedAt).getTime();
        return t >= sentAtMs;
      },
    );
    const lostInbound: LostInboundEntry[] = inboundAfter
      .filter((row) => isNotStored(row, staleCutoff))
      .map((row) => ({
        messageId: row.messageId,
        receivedAt: new Date(row.receivedAt).toISOString(),
        preview: row.preview,
        processingStatus: row.processingStatus,
        reason:
          row.signatureStatus === "invalid"
            ? "rejected_invalid_signature"
            : row.processingReason,
        signatureStatus: row.signatureStatus,
      }));

    const other = (otherByPhone.get(conv.participantPhone) ?? [])
      .filter((o) => o.lastIncomingAt.getTime() >= sentAtMs)
      .sort((a, b) => b.lastIncomingAt.getTime() - a.lastIncomingAt.getTime())[0];

    let verdict: ReadNotRepliedVerdict;
    if (lostInbound.length > 0) {
      verdict = "webhook_received_not_stored";
    } else if (other) {
      verdict = "replied_on_other_conversation";
    } else if (!coverageStartedAt || readAtMs < coverageStartedAt.getTime()) {
      verdict = "no_log_coverage";
    } else {
      verdict = "no_inbound_webhook";
    }
    verdictCounts[verdict] += 1;

    const text = group.text || group.caption;
    return {
      conversationId: String(conv._id),
      phone: conv.participantPhone,
      name: conv.participantName,
      location: conv.participantLocation,
      conversationType: conv.conversationType,
      businessPhoneId: conv.businessPhoneId ?? group.businessPhoneId ?? "",
      assignedAgentName: conv.assignedAgent
        ? agentNameById.get(String(conv.assignedAgent))
        : undefined,
      lastReadMessage: {
        messageId: group.messageId,
        type: group.type,
        templateName: group.templateName,
        preview: text ? text.slice(0, 140) : undefined,
        sentAt: new Date(group.sentAt).toISOString(),
        readAt: new Date(group.readAt).toISOString(),
      },
      readMessageCount: group.readMessageCount,
      verdict,
      lostInbound,
      otherConversation: other
        ? {
            conversationId: other.conversationId,
            businessPhoneId: other.businessPhoneId,
            lastIncomingAt: other.lastIncomingAt.toISOString(),
          }
        : undefined,
    };
  });

  const filtered = params.verdict
    ? allRows.filter((r) => r.verdict === params.verdict)
    : allRows;

  filtered.sort((a, b) => {
    const byVerdict = VERDICT_PRIORITY[a.verdict] - VERDICT_PRIORITY[b.verdict];
    if (byVerdict !== 0) return byVerdict;
    return (
      new Date(b.lastReadMessage.readAt).getTime() -
      new Date(a.lastReadMessage.readAt).getTime()
    );
  });

  const start = (params.page - 1) * params.limit;
  return {
    rows: filtered.slice(start, start + params.limit),
    total: filtered.length,
    page: params.page,
    totalPages: Math.max(1, Math.ceil(filtered.length / params.limit)),
    verdictCounts,
    coverageStartedAt: iso(coverageStartedAt),
    generatedAt: new Date(now).toISOString(),
    truncated,
  };
}
