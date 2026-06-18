import mongoose from "mongoose";
import WhatsAppConversation from "@/models/whatsappConversation";
import WhatsAppMessage from "@/models/whatsappMessage";
import WhatsAppCallLog from "@/models/whatsappCallLog";
import Employees from "@/models/employee";
import Visits from "@/models/visit";
import Bookings from "@/models/booking";
import { WHATSAPP_CRM_LABELS } from "@/lib/whatsapp/crmLabels";
import {
  SLA_RESPONSE_MINUTES,
  formatDurationMs,
  percentile,
  bulkDeriveMetricsFromMessages,
  type DerivedConversationMetrics,
} from "@/lib/whatsapp/conversationMetricsService";
import type {
  AgentAnalyticsRow,
  LocationAnalyticsRow,
  ResponseDistributionBucket,
  SegmentMetric,
  SlaStats,
  TemplateMetric,
  TimeStats,
  WhatsAppOverviewResponse,
} from "./types";

const PAGE_SIZE = 25;
const TPL_PAGE_SIZE = 10;
const MS_5M = 5 * 60 * 1000;
const MS_30M = 30 * 60 * 1000;
const MS_2H = 2 * 60 * 60 * 1000;
const MS_24H = 24 * 60 * 60 * 1000;

export function dateRangeFromPeriod(period: string): { $gte: Date; $lte: Date } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  switch (period) {
    case "last_month":
      return {
        $gte: new Date(year, month - 1, 1),
        $lte: new Date(year, month, 0, 23, 59, 59),
      };
    case "last_7_days":
      return { $gte: new Date(Date.now() - 7 * 86400000), $lte: now };
    case "last_30_days":
      return { $gte: new Date(Date.now() - 30 * 86400000), $lte: now };
    default:
      return { $gte: new Date(year, month, 1), $lte: now };
  }
}

export interface AnalyticsDateRange {
  allTime: boolean;
  gte?: Date;
  lte?: Date;
}

export function resolveAnalyticsDateRange(
  period: string,
  dateFrom?: string | null,
  dateTo?: string | null,
): AnalyticsDateRange {
  if (period === "all_time") {
    return { allTime: true };
  }
  if (period === "custom" && dateFrom) {
    const gte = new Date(dateFrom);
    const lte = dateTo ? new Date(dateTo) : new Date();
    gte.setHours(0, 0, 0, 0);
    lte.setHours(23, 59, 59, 999);
    return { allTime: false, gte, lte };
  }
  const dr = dateRangeFromPeriod(period);
  return { allTime: false, gte: dr.$gte, lte: dr.$lte };
}

function mongoDateRange(range: AnalyticsDateRange): { $gte: Date; $lte: Date } | null {
  if (range.allTime || !range.gte || !range.lte) return null;
  return { $gte: range.gte, $lte: range.lte };
}

function buildConvFilter(
  dateRange: AnalyticsDateRange,
  userAreas: string[],
  isFullAccess: boolean,
): Record<string, unknown> {
  const filter: Record<string, unknown> = {
    source: { $ne: "internal" },
  };
  const mongoRange = mongoDateRange(dateRange);
  if (mongoRange) {
    filter.$or = [
      { lastMessageTime: mongoRange },
      { createdAt: mongoRange },
      { firstOutboundMessageAt: mongoRange },
    ];
  }
  if (!isFullAccess && userAreas.length > 0) {
    filter.participantLocationKey = { $in: userAreas };
  }
  return filter;
}

function normalizeConversationDefaults(conv: ConvLean): ConvLean {
  return {
    ...conv,
    conversationType: conv.conversationType === "guest" ? "guest" : "owner",
    rentalType:
      conv.rentalType === "Short Term" || conv.rentalType === "General"
        ? conv.rentalType
        : "Long Term",
  };
}

function mergeConversationMetrics(
  conv: ConvLean,
  derived?: DerivedConversationMetrics,
): ConvLean {
  if (!derived) return conv;

  return {
    ...conv,
    firstOutboundMessageAt:
      conv.firstOutboundMessageAt ?? derived.firstOutboundMessageAt,
    firstCustomerReplyAt:
      conv.firstCustomerReplyAt ?? derived.firstCustomerReplyAt,
    firstAgentReplyAt: conv.firstAgentReplyAt ?? derived.firstAgentReplyAt,
    customerMessageCount:
      (conv.customerMessageCount ?? 0) > 0
        ? conv.customerMessageCount!
        : derived.customerMessageCount,
    agentMessageCount:
      (conv.agentMessageCount ?? 0) > 0
        ? conv.agentMessageCount!
        : derived.agentMessageCount,
    openingTemplateName:
      conv.openingTemplateName || derived.openingTemplateName,
    slaBreached: conv.slaBreached ?? derived.slaBreached,
  };
}

function applyLegacyConversationFields(conv: ConvLean): ConvLean {
  const outbound =
    conv.firstOutboundMessageAt ??
    conv.lastOutgoingMessageTime ??
    conv.firstMessageTime;
  const customerReply =
    conv.firstCustomerReplyAt ?? conv.lastCustomerMessageAt;

  return {
    ...conv,
    firstOutboundMessageAt: outbound,
    firstCustomerReplyAt: customerReply,
    customerMessageCount:
      (conv.customerMessageCount ?? 0) > 0
        ? conv.customerMessageCount!
        : customerReply
          ? 1
          : 0,
    agentMessageCount:
      (conv.agentMessageCount ?? 0) > 0
        ? conv.agentMessageCount!
        : outbound
          ? 1
          : 0,
  };
}

async function enrichConversationsWithMetrics(
  conversations: ConvLean[],
): Promise<ConvLean[]> {
  if (conversations.length === 0) return conversations;

  const derivedMap = await bulkDeriveMetricsFromMessages(
    conversations.map((c) => c._id),
  );

  return conversations.map((c) =>
    normalizeConversationDefaults(
      applyLegacyConversationFields(
        mergeConversationMetrics(c, derivedMap.get(c._id.toString())),
      ),
    ),
  );
}

function timeStatsFromValues(values: number[]): TimeStats {
  if (values.length === 0) {
    return {
      averageMs: 0,
      medianMs: 0,
      p90Ms: 0,
      averageLabel: "—",
      medianLabel: "—",
      p90Label: "—",
    };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const averageMs = Math.round(sum / sorted.length);
  const medianMs = percentile(sorted, 50);
  const p90Ms = percentile(sorted, 90);
  return {
    averageMs,
    medianMs,
    p90Ms,
    averageLabel: formatDurationMs(averageMs),
    medianLabel: formatDurationMs(medianMs),
    p90Label: formatDurationMs(p90Ms),
  };
}

function bucketCustomerReplyMs(ms: number | null | undefined): string {
  if (ms == null || ms <= 0) return "no_reply";
  if (ms < MS_5M) return "< 5 mins";
  if (ms < MS_30M) return "5–30 mins";
  if (ms < MS_2H) return "30 mins–2h";
  if (ms < MS_24H) return "2h–24h";
  return ">24h";
}

interface ConvLean {
  _id: mongoose.Types.ObjectId;
  participantLocationKey?: string;
  participantLocation?: string;
  conversationType?: string;
  rentalType?: string;
  assignedAgent?: mongoose.Types.ObjectId;
  openingTemplateName?: string;
  retargetTemplateName?: string;
  firstOutboundMessageAt?: Date;
  firstCustomerReplyAt?: Date;
  firstAgentReplyAt?: Date;
  customerMessageCount?: number;
  agentMessageCount?: number;
  leadQueryId?: mongoose.Types.ObjectId;
  labels?: string[];
  leadTemperature?: string;
  slaBreached?: boolean;
  lastMessageTime?: Date;
  lastCustomerMessageAt?: Date;
  lastOutgoingMessageTime?: Date;
  firstMessageTime?: Date;
  status?: string;
}

function mapSegment(
  label: string,
  rows: ConvLean[],
  key?: string,
): SegmentMetric {
  const outbound = rows.filter((r) => r.firstOutboundMessageAt).length;
  const responded = rows.filter((r) => r.firstCustomerReplyAt).length;
  const engaged = rows.filter(
    (r) => (r.agentMessageCount ?? 0) > 0 && (r.customerMessageCount ?? 0) > 1,
  ).length;
  const multiReply = rows.filter((r) => (r.customerMessageCount ?? 0) >= 3).length;

  const customerReplyMs = rows
    .filter((r) => r.firstCustomerReplyAt && r.firstOutboundMessageAt)
    .map(
      (r) =>
        new Date(r.firstCustomerReplyAt!).getTime() -
        new Date(r.firstOutboundMessageAt!).getTime(),
    );
  const agentReplyMs = rows
    .filter((r) => r.firstAgentReplyAt && r.firstCustomerReplyAt)
    .map(
      (r) =>
        new Date(r.firstAgentReplyAt!).getTime() -
        new Date(r.firstCustomerReplyAt!).getTime(),
    );

  const avgCustomer =
    customerReplyMs.length > 0
      ? customerReplyMs.reduce((a, b) => a + b, 0) / customerReplyMs.length
      : 0;
  const avgAgent =
    agentReplyMs.length > 0
      ? agentReplyMs.reduce((a, b) => a + b, 0) / agentReplyMs.length
      : 0;

  return {
    label,
    key,
    outbound,
    responded,
    responseRate: outbound > 0 ? Math.round((responded / outbound) * 100) : 0,
    engaged,
    engagementRate: outbound > 0 ? Math.round((engaged / outbound) * 100) : 0,
    multiReply,
    multiReplyRate: outbound > 0 ? Math.round((multiReply / outbound) * 100) : 0,
    avgCustomerReplyMs: Math.round(avgCustomer),
    avgAgentReplyMs: Math.round(avgAgent),
  };
}

export async function buildWhatsAppOverview(params: {
  period: string;
  dateFrom?: string | null;
  dateTo?: string | null;
  userAreas: string[];
  isFullAccess: boolean;
  locationPage: number;
  templatePage: number;
}): Promise<WhatsAppOverviewResponse> {
  const dateRange = resolveAnalyticsDateRange(
    params.period,
    params.dateFrom,
    params.dateTo,
  );
  const convFilter = buildConvFilter(dateRange, params.userAreas, params.isFullAccess);

  const mongoRange = mongoDateRange(dateRange);
  const msgFilter: Record<string, unknown> = {
    source: { $ne: "internal" },
    direction: "outgoing",
    ...(mongoRange ? { timestamp: mongoRange } : {}),
  };

  const callFilter: Record<string, unknown> = mongoRange
    ? { startedAt: mongoRange }
    : {};

  const [rawConversations, msgAgg, callAgg] = await Promise.all([
    WhatsAppConversation.find(convFilter)
      .select(
        "participantLocationKey participantLocation conversationType rentalType assignedAgent openingTemplateName retargetTemplateName firstOutboundMessageAt firstCustomerReplyAt firstAgentReplyAt customerMessageCount agentMessageCount leadQueryId labels leadTemperature slaBreached lastMessageTime lastCustomerMessageAt lastOutgoingMessageTime firstMessageTime status",
      )
      .lean<ConvLean[]>(),
    WhatsAppMessage.aggregate<{
      _id: string;
      sent: number;
      delivered: number;
      read: number;
    }>([
      {
        $match: {
          ...msgFilter,
          type: "template",
          templateName: { $exists: true, $ne: "" },
        },
      },
      {
        $group: {
          _id: "$templateName",
          sent: { $sum: 1 },
          delivered: {
            $sum: {
              $cond: [{ $in: ["$status", ["delivered", "read"]] }, 1, 0],
            },
          },
          read: { $sum: { $cond: [{ $eq: ["$status", "read"] }, 1, 0] } },
        },
      },
      { $sort: { sent: -1 } },
    ]),
    WhatsAppCallLog.aggregate<{
      _id: null;
      total: number;
      connected: number;
      missed: number;
      declined: number;
      totalDuration: number;
      connectedCount: number;
    }>([
      { $match: callFilter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          connected: {
            $sum: { $cond: [{ $eq: ["$lifecycleStatus", "connected"] }, 1, 0] },
          },
          missed: {
            $sum: { $cond: [{ $eq: ["$lifecycleStatus", "missed"] }, 1, 0] },
          },
          declined: {
            $sum: { $cond: [{ $eq: ["$lifecycleStatus", "declined"] }, 1, 0] },
          },
          totalDuration: {
            $sum: {
              $cond: [{ $ne: ["$durationSeconds", null] }, "$durationSeconds", 0],
            },
          },
          connectedCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$lifecycleStatus", "connected"] },
                    { $ne: ["$durationSeconds", null] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]),
  ]);

  const conversations = await enrichConversationsWithMetrics(rawConversations);

  const outboundConvs = conversations.filter((c) => c.firstOutboundMessageAt);
  const respondedConvs = conversations.filter((c) => c.firstCustomerReplyAt);
  const agentRepliedConvs = conversations.filter((c) => c.firstAgentReplyAt);

  const customerReplyMsValues = respondedConvs
    .filter((c) => c.firstOutboundMessageAt)
    .map(
      (c) =>
        new Date(c.firstCustomerReplyAt!).getTime() -
        new Date(c.firstOutboundMessageAt!).getTime(),
    )
    .filter((ms) => ms > 0);

  const agentReplyMsValues = agentRepliedConvs
    .filter((c) => c.firstCustomerReplyAt)
    .map(
      (c) =>
        new Date(c.firstAgentReplyAt!).getTime() -
        new Date(c.firstCustomerReplyAt!).getTime(),
    )
    .filter((ms) => ms > 0);

  const customerResponseRate =
    outboundConvs.length > 0
      ? Math.round((respondedConvs.length / outboundConvs.length) * 100)
      : 0;

  const agentResponseRate =
    respondedConvs.length > 0
      ? Math.round((agentRepliedConvs.length / respondedConvs.length) * 100)
      : 0;

  const slaMs = SLA_RESPONSE_MINUTES * 60 * 1000;
  let slaMet = 0;
  let slaMissed = 0;
  let slaPending = 0;
  for (const c of respondedConvs) {
    if (!c.firstAgentReplyAt) {
      const waiting = Date.now() - new Date(c.firstCustomerReplyAt!).getTime();
      if (waiting > slaMs) slaMissed += 1;
      else slaPending += 1;
    } else {
      const delta =
        new Date(c.firstAgentReplyAt).getTime() -
        new Date(c.firstCustomerReplyAt!).getTime();
      if (delta <= slaMs) slaMet += 1;
      else slaMissed += 1;
    }
  }
  const slaTotal = slaMet + slaMissed;
  const sla: SlaStats = {
    met: slaMet,
    missed: slaMissed,
    pending: slaPending,
    metPct: slaTotal > 0 ? Math.round((slaMet / slaTotal) * 100) : 0,
    missedPct: slaTotal > 0 ? Math.round((slaMissed / slaTotal) * 100) : 0,
  };

  const bucketLabels = [
    "< 5 mins",
    "5–30 mins",
    "30 mins–2h",
    "2h–24h",
    ">24h",
    "No Reply",
  ];
  const bucketCounts = new Map(bucketLabels.map((l) => [l, 0]));
  for (const c of outboundConvs) {
    const ms =
      c.firstCustomerReplyAt && c.firstOutboundMessageAt
        ? new Date(c.firstCustomerReplyAt).getTime() -
          new Date(c.firstOutboundMessageAt).getTime()
        : null;
    const label = bucketCustomerReplyMs(ms);
    const key = label === "no_reply" ? "No Reply" : label;
    bucketCounts.set(key, (bucketCounts.get(key) ?? 0) + 1);
  }
  const responseDistribution: ResponseDistributionBucket[] = bucketLabels.map(
    (label) => {
      const count = bucketCounts.get(label) ?? 0;
      return {
        label,
        count,
        pct:
          outboundConvs.length > 0
            ? Math.round((count / outboundConvs.length) * 100)
            : 0,
      };
    },
  );

  const now = Date.now();
  const operational = {
    activeConversations: conversations.filter((c) => {
      if (!c.lastMessageTime) return false;
      return now - new Date(c.lastMessageTime).getTime() < MS_24H;
    }).length,
    dormantConversations: conversations.filter((c) => {
      if (!c.lastMessageTime) return true;
      return now - new Date(c.lastMessageTime).getTime() >= 7 * MS_24H;
    }).length,
    unansweredConversations: conversations.filter(
      (c) =>
        (c.customerMessageCount ?? 0) > 0 &&
        !c.firstAgentReplyAt &&
        c.firstCustomerReplyAt,
    ).length,
    hotLeads: conversations.filter((c) => c.leadTemperature === "hot").length,
    warmLeads: conversations.filter((c) => c.leadTemperature === "warm").length,
    coldLeads: conversations.filter((c) => c.leadTemperature === "cold").length,
    dormantLeads: conversations.filter((c) => c.leadTemperature === "dormant")
      .length,
  };

  const ownerGuestStats: SegmentMetric[] = ["owner", "guest"].map((type) =>
    mapSegment(
      type === "owner" ? "Owners" : "Guests",
      conversations.filter((c) => c.conversationType === type),
      type,
    ),
  );

  const rentalTypeStats: SegmentMetric[] = [
    "Short Term",
    "Long Term",
    "General",
  ].map((rt) =>
    mapSegment(
      rt,
      conversations.filter((c) => c.rentalType === rt),
      rt,
    ),
  );

  const leadIds = [
    ...new Set(
      respondedConvs
        .map((c) => c.leadQueryId?.toString())
        .filter((id): id is string => !!id),
    ),
  ].map((id) => new mongoose.Types.ObjectId(id));

  const [visitLeadIds, bookingLeadIds] =
    leadIds.length > 0
      ? await Promise.all([
          Visits.distinct("lead", { lead: { $in: leadIds } }),
          Bookings.distinct("lead", { lead: { $in: leadIds } }),
        ])
      : [[], []];

  const visitLeadSet = new Set(visitLeadIds.map(String));
  const bookingLeadSet = new Set(bookingLeadIds.map(String));

  const visits = respondedConvs.filter((c) =>
    c.leadQueryId ? visitLeadSet.has(c.leadQueryId.toString()) : false,
  ).length;
  const goodToGo = respondedConvs.filter((c) =>
    (c.labels ?? []).includes(WHATSAPP_CRM_LABELS.GOOD_TO_GO),
  ).length;
  const bookings = respondedConvs.filter((c) =>
    c.leadQueryId ? bookingLeadSet.has(c.leadQueryId.toString()) : false,
  ).length;

  const funnel = {
    outbound: outboundConvs.length,
    customerResponded: respondedConvs.length,
    agentReplied: agentRepliedConvs.length,
    engaged: conversations.filter(
      (c) => (c.agentMessageCount ?? 0) > 0 && (c.customerMessageCount ?? 0) > 1,
    ).length,
    visits,
    goodToGo,
    bookings,
    replyToVisitRate:
      respondedConvs.length > 0
        ? Math.round((visits / respondedConvs.length) * 100)
        : 0,
    visitToGoodToGoRate:
      visits > 0 ? Math.round((goodToGo / visits) * 100) : 0,
    goodToGoToBookingRate:
      goodToGo > 0 ? Math.round((bookings / goodToGo) * 100) : 0,
    replyToBookingRate:
      respondedConvs.length > 0
        ? Math.round((bookings / respondedConvs.length) * 100)
        : 0,
  };

  const locationMap = new Map<string, ConvLean[]>();
  for (const c of conversations) {
    const key = c.participantLocationKey?.trim();
    if (!key) continue;
    const list = locationMap.get(key) ?? [];
    list.push(c);
    locationMap.set(key, list);
  }

  const locationMapRows: LocationAnalyticsRow[] = [...locationMap.entries()]
    .map(([locationKey, rows]) => {
      const outbound = rows.filter((r) => r.firstOutboundMessageAt).length;
      const responded = rows.filter((r) => r.firstCustomerReplyAt).length;
      const visitCount = rows.filter(
        (r) => r.leadQueryId && visitLeadSet.has(r.leadQueryId.toString()),
      ).length;
      const bookingCount = rows.filter(
        (r) => r.leadQueryId && bookingLeadSet.has(r.leadQueryId.toString()),
      ).length;
      const customerMs = rows
        .filter((r) => r.firstCustomerReplyAt && r.firstOutboundMessageAt)
        .map(
          (r) =>
            new Date(r.firstCustomerReplyAt!).getTime() -
            new Date(r.firstOutboundMessageAt!).getTime(),
        );
      const agentMs = rows
        .filter((r) => r.firstAgentReplyAt && r.firstCustomerReplyAt)
        .map(
          (r) =>
            new Date(r.firstAgentReplyAt!).getTime() -
            new Date(r.firstCustomerReplyAt!).getTime(),
        );
      return {
        locationKey,
        location:
          rows[0]?.participantLocation ||
          locationKey.charAt(0).toUpperCase() + locationKey.slice(1),
        outbound,
        responded,
        responseRate: outbound > 0 ? Math.round((responded / outbound) * 100) : 0,
        avgCustomerReplyMs:
          customerMs.length > 0
            ? Math.round(customerMs.reduce((a, b) => a + b, 0) / customerMs.length)
            : 0,
        avgAgentReplyMs:
          agentMs.length > 0
            ? Math.round(agentMs.reduce((a, b) => a + b, 0) / agentMs.length)
            : 0,
        visitRate:
          responded > 0 ? Math.round((visitCount / responded) * 100) : 0,
        bookingRate:
          responded > 0 ? Math.round((bookingCount / responded) * 100) : 0,
        hotLeads: rows.filter((r) => r.leadTemperature === "hot").length,
        ownerCount: rows.filter((r) => r.conversationType === "owner").length,
        guestCount: rows.filter((r) => r.conversationType === "guest").length,
        shortTermCount: rows.filter((r) => r.rentalType === "Short Term").length,
        longTermCount: rows.filter((r) => r.rentalType === "Long Term").length,
      };
    })
    .sort((a, b) => b.outbound - a.outbound);

  const locationPage = params.locationPage;
  const locationStats = {
    rows: locationMapRows.slice(
      (locationPage - 1) * PAGE_SIZE,
      locationPage * PAGE_SIZE,
    ),
    total: locationMapRows.length,
    page: locationPage,
    pageSize: PAGE_SIZE,
  };

  const agentMap = new Map<string, ConvLean[]>();
  for (const c of conversations) {
    if (!c.assignedAgent) continue;
    const id = c.assignedAgent.toString();
    const list = agentMap.get(id) ?? [];
    list.push(c);
    agentMap.set(id, list);
  }

  const agentIds = [...agentMap.keys()];
  const employeeDocs = await Employees.find({ _id: { $in: agentIds } })
    .select("_id name email")
    .lean<Array<{ _id: unknown; name?: string; email?: string }>>();
  const empMap = new Map(
    employeeDocs.map((e) => [String(e._id), e.name ?? e.email ?? "Agent"]),
  );

  const agentStats: AgentAnalyticsRow[] = [...agentMap.entries()]
    .map(([agentId, rows]) => {
      const outbound = rows.filter((r) => r.firstOutboundMessageAt).length;
      const responded = rows.filter((r) => r.firstCustomerReplyAt).length;
      const agentMs = rows
        .filter((r) => r.firstAgentReplyAt && r.firstCustomerReplyAt)
        .map(
          (r) =>
            new Date(r.firstAgentReplyAt!).getTime() -
            new Date(r.firstCustomerReplyAt!).getTime(),
        );
      let met = 0;
      let evaluated = 0;
      for (const r of rows) {
        if (!r.firstCustomerReplyAt) continue;
        if (!r.firstAgentReplyAt) continue;
        evaluated += 1;
        const delta =
          new Date(r.firstAgentReplyAt).getTime() -
          new Date(r.firstCustomerReplyAt).getTime();
        if (delta <= slaMs) met += 1;
      }
      return {
        agentId,
        name: empMap.get(agentId) ?? "Unknown",
        outbound,
        responded,
        responseRate: outbound > 0 ? Math.round((responded / outbound) * 100) : 0,
        avgAgentReplyMs:
          agentMs.length > 0
            ? Math.round(agentMs.reduce((a, b) => a + b, 0) / agentMs.length)
            : 0,
        conversations: rows.length,
        slaMetPct: evaluated > 0 ? Math.round((met / evaluated) * 100) : 0,
      };
    })
    .sort((a, b) => b.conversations - a.conversations)
    .slice(0, 20);

  const templateResponded = new Map<string, number>();
  const templateReplyMs = new Map<string, number[]>();
  for (const c of conversations) {
    const tpl = c.openingTemplateName || c.retargetTemplateName;
    if (!tpl || !c.firstOutboundMessageAt) continue;
    if (c.firstCustomerReplyAt) {
      templateResponded.set(tpl, (templateResponded.get(tpl) ?? 0) + 1);
      const ms =
        new Date(c.firstCustomerReplyAt).getTime() -
        new Date(c.firstOutboundMessageAt).getTime();
      if (ms > 0) {
        const arr = templateReplyMs.get(tpl) ?? [];
        arr.push(ms);
        templateReplyMs.set(tpl, arr);
      }
    }
  }

  const allTemplates: TemplateMetric[] = msgAgg.map((t) => {
    const responded = templateResponded.get(t._id) ?? 0;
    const replyTimes = templateReplyMs.get(t._id) ?? [];
    const avgReplyMs =
      replyTimes.length > 0
        ? Math.round(replyTimes.reduce((a, b) => a + b, 0) / replyTimes.length)
        : 0;
    return {
      templateName: t._id,
      sent: t.sent,
      delivered: t.delivered,
      read: t.read,
      responded,
      responseRate: t.sent > 0 ? Math.round((responded / t.sent) * 100) : 0,
      deliveryRate: t.sent > 0 ? Math.round((t.delivered / t.sent) * 100) : 0,
      avgReplyMs,
      visits: 0,
      goodToGo: 0,
      bookings: 0,
    };
  });

  const templatePage = params.templatePage;
  const templateStats = {
    rows: allTemplates.slice(
      (templatePage - 1) * TPL_PAGE_SIZE,
      templatePage * TPL_PAGE_SIZE,
    ),
    total: allTemplates.length,
    page: templatePage,
    pageSize: TPL_PAGE_SIZE,
  };

  const call = callAgg[0];

  return {
    kpis: {
      customerResponseRate,
      avgCustomerReplyTime: timeStatsFromValues(customerReplyMsValues),
      agentResponseRate,
      avgAgentReplyTime: timeStatsFromValues(agentReplyMsValues),
    },
    operational,
    sla,
    responseDistribution,
    ownerGuestStats,
    rentalTypeStats,
    locationStats,
    locationMapRows,
    agentStats,
    templateStats,
    funnel,
    callStats: {
      total: call?.total ?? 0,
      connected: call?.connected ?? 0,
      missed: call?.missed ?? 0,
      declined: call?.declined ?? 0,
      avgDurationSeconds:
        (call?.connectedCount ?? 0) > 0
          ? Math.round(call!.totalDuration / call!.connectedCount)
          : 0,
    },
    generatedAt: new Date().toISOString(),
  };
}
