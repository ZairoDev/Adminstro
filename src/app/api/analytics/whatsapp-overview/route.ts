import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import WhatsAppConversation from "@/models/whatsappConversation";
import WhatsAppMessage from "@/models/whatsappMessage";
import WhatsAppCallLog from "@/models/whatsappCallLog";
import Employees from "@/models/employee";
import { normalizeUserAreas } from "@/lib/whatsapp/resolveAllowedPhoneConfigs";
import { FULL_ACCESS_ROLES } from "@/lib/whatsapp/config";

connectDb();

export const dynamic = "force-dynamic";

// ── 5-minute in-memory cache ────────────────────────────────────────────────
interface CacheEntry {
  data: WhatsAppOverviewResponse;
  expiresAt: number;
}

const responseCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

// ── Types ────────────────────────────────────────────────────────────────────
export interface KpiStats {
  replyRate: number;
  deliveryRate: number;
  avgResponseMinutes: number;
  activeConversations: number;
  totalSent: number;
  totalDelivered: number;
  totalReplied: number;
}

export interface SegmentStat {
  label: string;
  total: number;
  replied: number;
  replyRate: number;
}

export interface FunnelStep {
  label: string;
  count: number;
  pct: number;
}

export interface LocationStat {
  locationKey: string;
  location: string;
  ownerCount: number;
  guestCount: number;
  shortTermCount: number;
  longTermCount: number;
  generalCount: number;
  total: number;
  replied: number;
  delivered: number;
  replyRate: number;
  deliveryRate: number;
  avgResponseMinutes: number;
}

export interface LocationPage {
  rows: LocationStat[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AgentStat {
  agentId: string;
  name: string;
  conversations: number;
  replied: number;
  replyRate: number;
  avgResponseMinutes: number;
}

export interface TemplateStat {
  templateName: string;
  sent: number;
  delivered: number;
  replied: number;
  replyRate: number;
  deliveryRate: number;
}

export interface TemplateStats {
  rows: TemplateStat[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CallStats {
  total: number;
  connected: number;
  missed: number;
  declined: number;
  failed: number;
  avgDurationSeconds: number;
}

export interface WhatsAppOverviewResponse {
  kpis: KpiStats;
  ownerGuestStats: SegmentStat[];
  rentalTypeStats: SegmentStat[];
  funnel: FunnelStep[];
  locationStats: LocationPage;
  /** All locations (unpaginated) — used by map view */
  locationMapRows: LocationStat[];
  agentStats: AgentStat[];
  templateStats: TemplateStats;
  callStats: CallStats;
  generatedAt: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function dateRangeFromPeriod(period: string): { $gte: Date; $lte: Date } {
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
      return {
        $gte: new Date(Date.now() - 7 * 86400000),
        $lte: now,
      };
    case "last_30_days":
      return {
        $gte: new Date(Date.now() - 30 * 86400000),
        $lte: now,
      };
    default: // this_month
      return {
        $gte: new Date(year, month, 1),
        $lte: now,
      };
  }
}

const WHATSAPP_ANALYTICS_ROLES = [
  "SuperAdmin",
  "Admin",
  "Sales-TeamLead",
  "Sales",
  "Developer",
] as const;

// ── Main handler ─────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    await connectDb();
    const token = await getDataFromToken(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userRole = String((token as { role?: string }).role ?? "");
    if (!WHATSAPP_ANALYTICS_ROLES.includes(userRole as (typeof WHATSAPP_ANALYTICS_ROLES)[number])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userAreas = normalizeUserAreas((token as { allotedArea?: unknown }).allotedArea);
    const isFullAccess = (FULL_ACCESS_ROLES as readonly string[]).includes(userRole);

    const { searchParams } = req.nextUrl;
    const period = searchParams.get("period") ?? "this_month";
    const locationPage = Math.max(1, parseInt(searchParams.get("locationPage") ?? "1"));
    const templatePage = Math.max(1, parseInt(searchParams.get("templatePage") ?? "1"));
    const forceRefresh = searchParams.get("refresh") === "true" && isFullAccess;
    const PAGE_SIZE = 25;
    const TPL_PAGE_SIZE = 10;

    // Cache key: role + areas + period + pages
    const areaKey = isFullAccess ? "all" : userAreas.sort().join(",");
    const cacheKey = `wa_overview:${userRole}:${areaKey}:${period}:lp${locationPage}:tp${templatePage}`;
    if (!forceRefresh) {
      const cached = responseCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return NextResponse.json(cached.data);
      }
    }

    const dateRange = dateRangeFromPeriod(period);

    // ── Base conversation filter ─────────────────────────────────────────────
    const convFilter: Record<string, unknown> = {
      source: { $ne: "internal" },
      createdAt: dateRange,
    };
    if (!isFullAccess && userAreas.length > 0) {
      convFilter.participantLocationKey = { $in: userAreas };
    }

    // ── Message filter (outgoing templates = sent count) ────────────────────
    const msgFilter: Record<string, unknown> = {
      source: { $ne: "internal" },
      direction: "outgoing",
      timestamp: dateRange,
    };

    // ── [1] Main conversation aggregation (one pass) ─────────────────────────
    const [convAgg, convTotal] = await Promise.all([
      WhatsAppConversation.aggregate<{
        _id: null;
        totalConvs: number;
        activeConvs: number;
        replied: number;
        totalResponseMs: number;
        respondedCount: number;
      }>([
        { $match: convFilter },
        {
          $group: {
            _id: null,
            totalConvs: { $sum: 1 },
            activeConvs: {
              $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
            },
            replied: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: ["$lastCustomerMessageAt", null] },
                      { $ne: ["$firstMessageTime", null] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            totalResponseMs: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: ["$lastCustomerMessageAt", null] },
                      { $ne: ["$firstMessageTime", null] },
                    ],
                  },
                  {
                    $subtract: [
                      "$lastCustomerMessageAt",
                      "$firstMessageTime",
                    ],
                  },
                  0,
                ],
              },
            },
            respondedCount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: ["$lastCustomerMessageAt", null] },
                      { $ne: ["$firstMessageTime", null] },
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
      WhatsAppConversation.countDocuments(convFilter),
    ]);

    // ── [2] Message delivery stats (one pass) ───────────────────────────────
    const [msgStats] = await WhatsAppMessage.aggregate<{
      _id: null;
      sent: number;
      delivered: number;
      read: number;
      failed: number;
    }>([
      { $match: msgFilter },
      {
        $group: {
          _id: null,
          sent: { $sum: 1 },
          delivered: {
            $sum: {
              $cond: [
                { $in: ["$status", ["delivered", "read"]] },
                1,
                0,
              ],
            },
          },
          read: {
            $sum: { $cond: [{ $eq: ["$status", "read"] }, 1, 0] },
          },
          failed: {
            $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] },
          },
        },
      },
    ]);

    // ── [3] Owner vs Guest ───────────────────────────────────────────────────
    const ownerGuestRaw = await WhatsAppConversation.aggregate<{
      _id: string | null;
      total: number;
      replied: number;
    }>([
      { $match: { ...convFilter, conversationType: { $in: ["owner", "guest"] } } },
      {
        $group: {
          _id: "$conversationType",
          total: { $sum: 1 },
          replied: {
            $sum: {
              $cond: [{ $ne: ["$lastCustomerMessageAt", null] }, 1, 0],
            },
          },
        },
      },
    ]);

    const ownerGuestStats: SegmentStat[] = ["owner", "guest"].map((type) => {
      const found = ownerGuestRaw.find((r) => r._id === type);
      const total = found?.total ?? 0;
      const replied = found?.replied ?? 0;
      return {
        label: type === "owner" ? "Owners" : "Guests",
        total,
        replied,
        replyRate: total > 0 ? Math.round((replied / total) * 100) : 0,
      };
    });

    // ── [4] Rental type ──────────────────────────────────────────────────────
    const rentalRaw = await WhatsAppConversation.aggregate<{
      _id: string | null;
      total: number;
      replied: number;
    }>([
      { $match: { ...convFilter, rentalType: { $in: ["Short Term", "Long Term", "General"] } } },
      {
        $group: {
          _id: "$rentalType",
          total: { $sum: 1 },
          replied: {
            $sum: {
              $cond: [{ $ne: ["$lastCustomerMessageAt", null] }, 1, 0],
            },
          },
        },
      },
    ]);

    const rentalTypeStats: SegmentStat[] = ["Short Term", "Long Term", "General"].map(
      (rt) => {
        const found = rentalRaw.find((r) => r._id === rt);
        const total = found?.total ?? 0;
        const replied = found?.replied ?? 0;
        return {
          label: rt,
          total,
          replied,
          replyRate: total > 0 ? Math.round((replied / total) * 100) : 0,
        };
      },
    );

    // ── [5] Location stats (paginated) ───────────────────────────────────────
    const locationRaw = await WhatsAppConversation.aggregate<{
      _id: string;
      location: string;
      ownerCount: number;
      guestCount: number;
      shortTermCount: number;
      longTermCount: number;
      generalCount: number;
      total: number;
      replied: number;
      delivered: number;
      totalResponseMs: number;
      respondedCount: number;
    }>([
      {
        $match: {
          ...convFilter,
          participantLocationKey: { $exists: true, $ne: "" },
        },
      },
      {
        $group: {
          _id: "$participantLocationKey",
          location: { $first: "$participantLocation" },
          ownerCount: {
            $sum: { $cond: [{ $eq: ["$conversationType", "owner"] }, 1, 0] },
          },
          guestCount: {
            $sum: { $cond: [{ $eq: ["$conversationType", "guest"] }, 1, 0] },
          },
          shortTermCount: {
            $sum: { $cond: [{ $eq: ["$rentalType", "Short Term"] }, 1, 0] },
          },
          longTermCount: {
            $sum: { $cond: [{ $eq: ["$rentalType", "Long Term"] }, 1, 0] },
          },
          generalCount: {
            $sum: { $cond: [{ $eq: ["$rentalType", "General"] }, 1, 0] },
          },
          total: { $sum: 1 },
          replied: {
            $sum: {
              $cond: [{ $ne: ["$lastCustomerMessageAt", null] }, 1, 0],
            },
          },
          delivered: {
            $sum: {
              $cond: [
                {
                  $in: ["$lastMessageStatus", ["delivered", "read"]],
                },
                1,
                0,
              ],
            },
          },
          totalResponseMs: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$lastCustomerMessageAt", null] },
                    { $ne: ["$firstMessageTime", null] },
                  ],
                },
                { $subtract: ["$lastCustomerMessageAt", "$firstMessageTime"] },
                0,
              ],
            },
          },
          respondedCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$lastCustomerMessageAt", null] },
                    { $ne: ["$firstMessageTime", null] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { total: -1 } },
    ]);

    const locationTotalCount = locationRaw.length;

    const mapLocationRow = (r: (typeof locationRaw)[number]): LocationStat => ({
      locationKey: r._id,
      location: r.location || r._id.charAt(0).toUpperCase() + r._id.slice(1),
      ownerCount: r.ownerCount,
      guestCount: r.guestCount,
      shortTermCount: r.shortTermCount,
      longTermCount: r.longTermCount,
      generalCount: r.generalCount,
      total: r.total,
      replied: r.replied,
      delivered: r.delivered,
      replyRate: r.total > 0 ? Math.round((r.replied / r.total) * 100) : 0,
      deliveryRate: r.total > 0 ? Math.round((r.delivered / r.total) * 100) : 0,
      avgResponseMinutes:
        r.respondedCount > 0
          ? Math.round(r.totalResponseMs / r.respondedCount / 60000)
          : 0,
    });

    const locationMapRows = locationRaw.map(mapLocationRow);
    const locationPage_ = locationMapRows.slice(
      (locationPage - 1) * PAGE_SIZE,
      locationPage * PAGE_SIZE,
    );

    const locationStats: LocationPage = {
      rows: locationPage_,
      total: locationTotalCount,
      page: locationPage,
      pageSize: PAGE_SIZE,
    };

    // ── [6] Agent stats ──────────────────────────────────────────────────────
    const agentRaw = await WhatsAppConversation.aggregate<{
      _id: string;
      conversations: number;
      replied: number;
      totalResponseMs: number;
      respondedCount: number;
    }>([
      {
        $match: {
          ...convFilter,
          assignedAgent: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: { $toString: "$assignedAgent" },
          conversations: { $sum: 1 },
          replied: {
            $sum: {
              $cond: [{ $ne: ["$lastCustomerMessageAt", null] }, 1, 0],
            },
          },
          totalResponseMs: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$lastCustomerMessageAt", null] },
                    { $ne: ["$firstMessageTime", null] },
                  ],
                },
                { $subtract: ["$lastCustomerMessageAt", "$firstMessageTime"] },
                0,
              ],
            },
          },
          respondedCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$lastCustomerMessageAt", null] },
                    { $ne: ["$firstMessageTime", null] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { conversations: -1 } },
      { $limit: 20 },
    ]);

    const agentIds = agentRaw.map((a) => a._id);
    const employeeDocs = await Employees.find({ _id: { $in: agentIds } })
      .select("_id name email")
      .lean<Array<{ _id: unknown; name?: string; email?: string }>>();
    const empMap = new Map(
      employeeDocs.map((e) => [String(e._id), e.name ?? e.email ?? "Agent"]),
    );

    const agentStats: AgentStat[] = agentRaw.map((a) => ({
      agentId: a._id,
      name: empMap.get(a._id) ?? "Unknown",
      conversations: a.conversations,
      replied: a.replied,
      replyRate: a.conversations > 0 ? Math.round((a.replied / a.conversations) * 100) : 0,
      avgResponseMinutes:
        a.respondedCount > 0
          ? Math.round(a.totalResponseMs / a.respondedCount / 60000)
          : 0,
    }));

    // ── [7] Template stats (paginated) ───────────────────────────────────────
    const templateRaw = await WhatsAppMessage.aggregate<{
      _id: string;
      sent: number;
      delivered: number;
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
        },
      },
      { $sort: { sent: -1 } },
    ]);

    // Get reply counts per template by joining with conversations
    const templateTotalCount = templateRaw.length;
    const templatePage_ = templateRaw.slice(
      (templatePage - 1) * TPL_PAGE_SIZE,
      templatePage * TPL_PAGE_SIZE,
    );

    const templateStats: TemplateStats = {
      rows: templatePage_.map((t) => {
        const deliveryRate = t.sent > 0 ? Math.round((t.delivered / t.sent) * 100) : 0;
        return {
          templateName: t._id,
          sent: t.sent,
          delivered: t.delivered,
          replied: 0, // template-level reply tracking requires joining retargetTemplateName or similar
          replyRate: 0,
          deliveryRate,
        };
      }),
      total: templateTotalCount,
      page: templatePage,
      pageSize: TPL_PAGE_SIZE,
    };

    // Get replied count for visible templates from retargetTemplateName on conversations
    const visibleTemplateNames = templatePage_.map((t) => t._id);
    if (visibleTemplateNames.length > 0) {
      const tplConvRaw = await WhatsAppConversation.aggregate<{
        _id: string;
        replied: number;
        total: number;
      }>([
        {
          $match: {
            ...convFilter,
            retargetTemplateName: { $in: visibleTemplateNames },
          },
        },
        {
          $group: {
            _id: "$retargetTemplateName",
            total: { $sum: 1 },
            replied: {
              $sum: {
                $cond: [{ $ne: ["$lastCustomerMessageAt", null] }, 1, 0],
              },
            },
          },
        },
      ]);
      const tplMap = new Map(tplConvRaw.map((r) => [r._id, r]));
      templateStats.rows = templateStats.rows.map((row) => {
        const conv = tplMap.get(row.templateName);
        if (!conv) return row;
        return {
          ...row,
          replied: conv.replied,
          replyRate: conv.total > 0 ? Math.round((conv.replied / conv.total) * 100) : 0,
        };
      });
    }

    // ── [8] Call stats ───────────────────────────────────────────────────────
    const callFilter: Record<string, unknown> = {
      startedAt: dateRange,
    };
    if (!isFullAccess && userAreas.length > 0) {
      // No participantLocationKey on calls — filter by businessPhoneId is not straightforward
      // Leave unfiltered for now; calls are low-volume
    }

    const [callAgg] = await WhatsAppCallLog.aggregate<{
      _id: null;
      total: number;
      connected: number;
      missed: number;
      declined: number;
      failed: number;
      totalDuration: number;
      connectedCount: number;
    }>([
      { $match: callFilter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          connected: {
            $sum: {
              $cond: [{ $eq: ["$lifecycleStatus", "connected"] }, 1, 0],
            },
          },
          missed: {
            $sum: {
              $cond: [{ $eq: ["$lifecycleStatus", "missed"] }, 1, 0],
            },
          },
          declined: {
            $sum: {
              $cond: [{ $eq: ["$lifecycleStatus", "declined"] }, 1, 0],
            },
          },
          failed: {
            $sum: {
              $cond: [
                { $in: ["$lifecycleStatus", ["failed", "timeout"]] },
                1,
                0,
              ],
            },
          },
          totalDuration: {
            $sum: {
              $cond: [
                { $ne: ["$durationSeconds", null] },
                "$durationSeconds",
                0,
              ],
            },
          },
          connectedCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ["$lifecycleStatus", "connected"] }, { $ne: ["$durationSeconds", null] }] },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    const callStats: CallStats = {
      total: callAgg?.total ?? 0,
      connected: callAgg?.connected ?? 0,
      missed: callAgg?.missed ?? 0,
      declined: callAgg?.declined ?? 0,
      failed: callAgg?.failed ?? 0,
      avgDurationSeconds:
        (callAgg?.connectedCount ?? 0) > 0
          ? Math.round(callAgg!.totalDuration / callAgg!.connectedCount)
          : 0,
    };

    // ── Assemble KPIs ────────────────────────────────────────────────────────
    const conv = convAgg[0];
    const msg = msgStats ?? { sent: 0, delivered: 0, read: 0, failed: 0 };
    const totalSent = msg.sent;
    const totalDelivered = msg.delivered;
    const totalReplied = conv?.replied ?? 0;
    const totalConvs = convTotal;

    const kpis: KpiStats = {
      replyRate: totalConvs > 0 ? Math.round((totalReplied / totalConvs) * 100) : 0,
      deliveryRate:
        totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0,
      avgResponseMinutes:
        (conv?.respondedCount ?? 0) > 0
          ? Math.round((conv!.totalResponseMs / conv!.respondedCount) / 60000)
          : 0,
      activeConversations: conv?.activeConvs ?? 0,
      totalSent,
      totalDelivered,
      totalReplied,
    };

    // ── Funnel ───────────────────────────────────────────────────────────────
    const funnel: FunnelStep[] = [
      { label: "Sent", count: totalSent, pct: 100 },
      {
        label: "Delivered",
        count: totalDelivered,
        pct: totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0,
      },
      {
        label: "Read",
        count: msg.read,
        pct: totalSent > 0 ? Math.round((msg.read / totalSent) * 100) : 0,
      },
      {
        label: "Replied",
        count: totalReplied,
        pct: totalSent > 0 ? Math.round((totalReplied / totalSent) * 100) : 0,
      },
    ];

    const result: WhatsAppOverviewResponse = {
      kpis,
      ownerGuestStats,
      rentalTypeStats,
      funnel,
      locationStats,
      locationMapRows,
      agentStats,
      templateStats,
      callStats,
      generatedAt: new Date().toISOString(),
    };

    // Cache
    responseCache.set(cacheKey, {
      data: result,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[whatsapp-overview]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
