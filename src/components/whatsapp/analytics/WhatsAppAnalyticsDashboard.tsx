"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import type { DateRange } from "react-day-picker";
import { CustomSelect } from "@/components/reusable-components/CustomSelect";
import { DateRangePicker } from "@/components/DateRangePicker";
import {
  MessageSquare,
  Clock,
  Users,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  List,
  Map,
  BarChart3,
  Flame,
  AlertCircle,
  CheckCircle2,
  Timer,
  Info,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { WhatsAppOverviewResponse } from "@/lib/whatsapp/analytics/types";
import { PhoneNumberHealth } from "@/components/whatsapp/PhoneNumberHealth";
import { InitiationLimitBadge } from "@/app/whatsapp/components/InitiationLimitBadge";

const EuropeMap = dynamic(() => import("./EuropeMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center text-xs text-gray-600" style={{ background: "#0d1117" }}>
      Loading map…
    </div>
  ),
});

const PERIOD_OPTIONS = [
  { value: "this_month", label: "This Month" },
  { value: "last_30_days", label: "Last 30 Days" },
  { value: "last_7_days", label: "Last 7 Days" },
  { value: "last_month", label: "Last Month" },
  { value: "all_time", label: "All Time" },
  { value: "custom", label: "Custom Range" },
] as const;
type Period = (typeof PERIOD_OPTIONS)[number]["value"];

const PERIOD_LABEL_BY_VALUE = Object.fromEntries(
  PERIOD_OPTIONS.map((p) => [p.value, p.label]),
) as Record<Period, string>;

function toIsoStart(d: Date): string {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString();
}

function toIsoEnd(d: Date): string {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x.toISOString();
}

const DIMENSIONS = ["Location", "Owner / Guests", "Rental Type", "Agent", "Template"] as const;
type Dimension = (typeof DIMENSIONS)[number];

const METRIC_HELP = {
  customerResponseRate:
    "How many outbound chats got a customer reply. Shown as a percentage: customers who replied ÷ conversations where you messaged first.",
  avgCustomerReply:
    "How long customers take to reply after your first message. Average is the mean wait time; median is the typical case; P90 flags slower replies.",
  agentResponseRate:
    "Of chats where the customer replied, how many got an agent reply. Formula: agent replied ÷ customer replied.",
  avgAgentReply:
    "How long agents take to send their first reply after a customer message. Average, median, and P90 are shown.",
  active24h:
    "Conversations with any message in the last 24 hours — currently active threads.",
  unanswered:
    "Customer has written in, but no agent has replied yet. These need attention.",
  hotLeads:
    "Leads marked hot by temperature scoring. Subtext also shows warm and cold counts.",
  slaCompliance:
    "Share of customer replies where an agent answered within 15 minutes. Missed means slower or still waiting past 15 min.",
  customerReplyDistribution:
    "Groups outbound conversations by how fast the customer replied — from under 5 minutes to no reply at all.",
  agentLeaderboard:
    "Agents ranked by how often customers reply to them and how often they meet the 15-minute SLA.",
  agentRespRate:
    "For this agent: customers who replied ÷ outbound conversations they handled.",
  agentSla:
    "For this agent: share of customer replies answered within 15 minutes.",
  locationLeaderboard:
    "Cities ranked by customer response rate and how often replies turn into bookings.",
  locationRespRate:
    "For this city: customers who replied ÷ outbound conversations in that area.",
  locationBookingRate:
    "For this city: bookings ÷ customers who replied — conversion after a WhatsApp reply.",
  templatePerformance:
    "Opening WhatsApp templates ranked by how often customers reply after receiving them.",
  templateRespRate:
    "For this template: customers who replied ÷ conversations opened with this template.",
  ownerGuest:
    "Compares owners vs guests. If conversation type is missing, it is counted as Owner.",
  rentalType:
    "Compares Short Term, Long Term, and General. If rental type is missing, it is counted as Long Term.",
  engagementRate:
    "A real back-and-forth chat: the agent sent messages and the customer sent more than one message.",
  multiReplyRate:
    "The customer sent 3 or more messages — stronger interest than a single reply.",
  replyToVisit:
    "Of customers who replied on WhatsApp, how many had a property visit logged.",
  visitToGoodToGo:
    "Of leads with a visit, how many were marked Good To Go.",
  goodToGoToBooking:
    "Of Good To Go leads, how many became a confirmed booking.",
  replyToBooking:
    "Full funnel: customers who replied on WhatsApp and eventually booked.",
  outbound:
    "Conversations where your team sent the first message (template or manual).",
  responded:
    "Outbound conversations where the customer replied at least once.",
  responseRate:
    "Customers who replied ÷ outbound conversations, shown as a percentage.",
  visitRate:
    "Of customers who replied, how many had a visit recorded.",
  bookingRate:
    "Of customers who replied, how many led to a booking.",
  hotLeadsCol:
    "Number of leads in this row marked as hot temperature.",
  templateSent: "How many times this template was sent in the selected period.",
  templateDelivered: "Messages successfully delivered to the customer's phone.",
  templateRead: "Messages the customer opened/read on WhatsApp.",
  templateAvgReply:
    "Average time for the customer to reply after this template was sent.",
  callConnected: "WhatsApp calls that were answered.",
  callMissed: "Incoming calls that were not answered.",
  callDeclined: "Calls the recipient declined.",
  callAvgDuration: "Average length of connected calls, in seconds.",
  callAnalytics: "Summary of WhatsApp voice calls in the selected date range.",
  viewByLocation:
    "Performance broken down by customer city/area. Switch between list and map view.",
  viewByOwnerGuest: "Performance split between owner and guest conversations.",
  viewByRentalType: "Performance split by Short Term, Long Term, and General rental.",
  viewByAgent: "Per-agent conversation volume, response rate, reply speed, and SLA.",
  viewByTemplate:
    "Per-template send volume, delivery/read rates, replies, and average reply time.",
} as const;

function MetricInfo({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex shrink-0 rounded-full text-gray-500 transition-colors hover:text-gray-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400"
          aria-label="How this metric works"
        >
          <Info size={12} strokeWidth={2} />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="z-[100] max-w-[min(320px,calc(100vw-2rem))] !overflow-visible whitespace-normal break-words border-gray-700 bg-gray-900 px-3 py-2 text-xs leading-relaxed text-gray-200"
      >
        <p className="m-0 whitespace-normal break-words">{text}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function LabelWithInfo({ label, info }: { label: string; info: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span>{label}</span>
      <MetricInfo text={info} />
    </span>
  );
}

function SectionTitle({ title, info }: { title: string; info: string }) {
  return (
    <p className="mb-3 flex items-center gap-1.5 text-xs font-medium text-gray-400">
      {title}
      <MetricInfo text={info} />
    </p>
  );
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border ${className}`}
      style={{ background: "#0d1117", borderColor: "rgba(255,255,255,0.08)" }}
    >
      {children}
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  info,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  info: string;
}) {
  return (
    <Card className="flex items-center gap-3 px-4 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: "rgba(255,255,255,0.06)" }}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="flex items-center gap-1 truncate text-[11px] text-gray-500">
          <span className="truncate">{label}</span>
          <MetricInfo text={info} />
        </p>
        <p className="text-xl font-semibold leading-tight text-white">{value}</p>
        {sub && <p className="truncate text-[10px] text-gray-600">{sub}</p>}
      </div>
    </Card>
  );
}

function FunnelCard({
  label,
  value,
  sub,
  info,
}: {
  label: string;
  value: string;
  sub: string;
  info: string;
}) {
  return (
    <Card className="px-4 py-3">
      <p className="flex items-center gap-1 text-[10px] text-gray-500">
        <span>{label}</span>
        <MetricInfo text={info} />
      </p>
      <p className="text-xl font-semibold text-white">{value}</p>
      <p className="text-[10px] text-gray-600">{sub}</p>
    </Card>
  );
}

function CallStatCard({
  label,
  value,
  info,
}: {
  label: string;
  value: string | number;
  info: string;
}) {
  return (
    <Card className="px-3 py-3">
      <p className="flex items-center gap-1 text-[10px] text-gray-500">
        <span>{label}</span>
        <MetricInfo text={info} />
      </p>
      <p className="text-lg font-semibold text-white">{value}</p>
    </Card>
  );
}

function RateBar({ rate }: { rate: number }) {
  const color = rate >= 70 ? "#22c55e" : rate >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1 w-12 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
        <div className="h-1 rounded-full" style={{ width: `${Math.min(100, rate)}%`, background: color }} />
      </div>
      <span className="text-xs text-white">{rate}%</span>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }} />
        ))}
      </div>
      <div className="h-64 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }} />
    </div>
  );
}

export default function WhatsAppAnalyticsDashboard() {
  const [data, setData] = useState<WhatsAppOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("this_month");
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [viewMode, setViewMode] = useState<"list" | "map">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("wa_analytics_view") as "list" | "map") ?? "list";
    }
    return "list";
  });
  const [dimension, setDimension] = useState<Dimension>("Location");
  const [locationPage, setLocationPage] = useState(1);
  const [templatePage, setTemplatePage] = useState(1);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(
    async (opts?: { refresh?: boolean; lp?: number; tp?: number }) => {
      if (period === "custom" && !customRange?.from) {
        setLoading(false);
        return;
      }

      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          period,
          locationPage: String(opts?.lp ?? locationPage),
          templatePage: String(opts?.tp ?? templatePage),
          ...(opts?.refresh ? { refresh: "true" } : {}),
        });
        if (period === "custom" && customRange?.from) {
          params.set("dateFrom", toIsoStart(customRange.from));
          const end = customRange.to ?? customRange.from;
          params.set("dateTo", toIsoEnd(end));
        }
        const res = await fetch(`/api/analytics/whatsapp-overview?${params}`, { signal: ctrl.signal });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Unknown error" }));
          throw new Error(err.error ?? `HTTP ${res.status}`);
        }
        setData(await res.json());
      } catch (e: unknown) {
        if (e instanceof Error && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    },
    [period, customRange, locationPage, templatePage],
  );

  useEffect(() => {
    setLocationPage(1);
    setTemplatePage(1);
  }, [period, customRange]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const locationTotalPages = data ? Math.ceil(data.locationStats.total / data.locationStats.pageSize) : 1;
  const templateTotalPages = data ? Math.ceil(data.templateStats.total / data.templateStats.pageSize) : 1;

  return (
    <TooltipProvider delayDuration={200}>
    <div className="min-h-screen" style={{ background: "#090c11", color: "#e5e7eb" }}>
      <div className="mx-auto max-w-screen-2xl space-y-5 px-4 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-semibold text-white">WhatsApp Analytics</h1>
            <p className="text-xs text-gray-500">Customer response, agent SLA, funnel & line health</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CustomSelect
              itemList={PERIOD_OPTIONS.map((p) => p.label)}
              triggerText="Period"
              value={PERIOD_LABEL_BY_VALUE[period]}
              onValueChange={(label) => {
                const next = PERIOD_OPTIONS.find((p) => p.label === label);
                if (!next) return;
                setPeriod(next.value);
                if (next.value !== "custom") {
                  setCustomRange(undefined);
                }
              }}
              triggerClassName="w-[140px] h-8 text-xs text-white"
            />
            {period === "custom" ? (
              <DateRangePicker
                date={customRange}
                setDate={setCustomRange}
                className="[&_button]:h-8 [&_button]:text-xs [&_button]:w-auto min-w-[200px]"
              />
            ) : null}
            <button
              onClick={() => void fetchData({ refresh: true })}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs text-gray-400 transition-colors hover:text-white disabled:opacity-50"
              style={{ borderColor: "rgba(255,255,255,0.12)" }}
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        {/* Line Health — moved from Sales dashboard */}
        <div className="space-y-3">
          <InitiationLimitBadge pollIntervalMs={30_000} />
          <PhoneNumberHealth />
        </div>

        {error && (
          <div className="rounded-lg border px-4 py-3 text-sm text-red-400" style={{ borderColor: "rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.07)" }}>
            {error}
          </div>
        )}

        {loading && !data && <Skeleton />}

        {data && (
          <div className="space-y-4">
            {/* Row 1 — Core response KPIs */}
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              <KpiCard icon={<MessageSquare size={16} className="text-emerald-400" />} label="Customer Response Rate" value={`${data.kpis.customerResponseRate}%`} sub={`${fmt(data.funnel.customerResponded)} / ${fmt(data.funnel.outbound)} outbound`} info={METRIC_HELP.customerResponseRate} />
              <KpiCard icon={<Clock size={16} className="text-blue-400" />} label="Avg Customer Reply" value={data.kpis.avgCustomerReplyTime.averageLabel} sub={`Median ${data.kpis.avgCustomerReplyTime.medianLabel} · P90 ${data.kpis.avgCustomerReplyTime.p90Label}`} info={METRIC_HELP.avgCustomerReply} />
              <KpiCard icon={<Users size={16} className="text-violet-400" />} label="Agent Response Rate" value={`${data.kpis.agentResponseRate}%`} sub={`${fmt(data.funnel.agentReplied)} replied to customers`} info={METRIC_HELP.agentResponseRate} />
              <KpiCard icon={<Timer size={16} className="text-amber-400" />} label="Avg Agent Reply" value={data.kpis.avgAgentReplyTime.averageLabel} sub={`Median ${data.kpis.avgAgentReplyTime.medianLabel} · P90 ${data.kpis.avgAgentReplyTime.p90Label}`} info={METRIC_HELP.avgAgentReply} />
            </div>

            {/* Row 2 — Operational */}
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              <KpiCard icon={<MessageSquare size={16} className="text-green-400" />} label="Active (24h)" value={fmt(data.operational.activeConversations)} sub="message in last 24h" info={METRIC_HELP.active24h} />
              <KpiCard icon={<AlertCircle size={16} className="text-red-400" />} label="Unanswered" value={fmt(data.operational.unansweredConversations)} sub="customer waiting on agent" info={METRIC_HELP.unanswered} />
              <KpiCard icon={<Flame size={16} className="text-orange-400" />} label="Hot Leads" value={fmt(data.operational.hotLeads)} sub={`${data.operational.warmLeads} warm · ${data.operational.coldLeads} cold`} info={METRIC_HELP.hotLeads} />
              <KpiCard icon={<CheckCircle2 size={16} className="text-indigo-400" />} label="SLA Compliance" value={`${data.sla.metPct}%`} sub={`${data.sla.met} met · ${data.sla.missed} missed (15m)`} info={METRIC_HELP.slaCompliance} />
            </div>

            {/* Row 3 — Distribution + leaderboards */}
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-4">
              <Card className="p-4 xl:col-span-1">
                <SectionTitle title="Customer Reply Distribution" info={METRIC_HELP.customerReplyDistribution} />
                <div className="space-y-2">
                  {data.responseDistribution.map((b) => (
                    <div key={b.label}>
                      <div className="mb-0.5 flex justify-between text-[11px]">
                        <span className="inline-flex items-center gap-1 text-gray-400">
                          {b.label}
                          <MetricInfo
                            text={
                              b.label === "No Reply"
                                ? "Outbound conversations where the customer never replied."
                                : `Outbound conversations where the customer replied within ${b.label.toLowerCase()} of your first message.`
                            }
                          />
                        </span>
                        <span className="text-white">{b.count} ({b.pct}%)</span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
                        <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${b.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-4 xl:col-span-1">
                <SectionTitle title="Agent Leaderboard" info={METRIC_HELP.agentLeaderboard} />
                <div className="max-h-48 overflow-y-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="text-gray-500">
                        <th className="py-1 text-left">Agent</th>
                        <th className="py-1 text-right"><LabelWithInfo label="Resp%" info={METRIC_HELP.agentRespRate} /></th>
                        <th className="py-1 text-right"><LabelWithInfo label="SLA" info={METRIC_HELP.agentSla} /></th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.agentStats.slice(0, 8).map((a) => (
                        <tr key={a.agentId} className="border-t border-white/5">
                          <td className="max-w-[90px] truncate py-1.5 text-white">{a.name}</td>
                          <td className="py-1.5 text-right text-gray-300">{a.responseRate}%</td>
                          <td className="py-1.5 text-right text-gray-300">{a.slaMetPct}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card className="p-4 xl:col-span-1">
                <SectionTitle title="Location Leaderboard" info={METRIC_HELP.locationLeaderboard} />
                <div className="max-h-48 overflow-y-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="text-gray-500">
                        <th className="py-1 text-left">City</th>
                        <th className="py-1 text-right"><LabelWithInfo label="Resp%" info={METRIC_HELP.locationRespRate} /></th>
                        <th className="py-1 text-right"><LabelWithInfo label="Book%" info={METRIC_HELP.locationBookingRate} /></th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...data.locationMapRows].sort((a, b) => b.responseRate - a.responseRate).slice(0, 8).map((l) => (
                        <tr key={l.locationKey} className="border-t border-white/5">
                          <td className="max-w-[90px] truncate py-1.5 text-white">{l.location}</td>
                          <td className="py-1.5 text-right text-gray-300">{l.responseRate}%</td>
                          <td className="py-1.5 text-right text-gray-300">{l.bookingRate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card className="p-4 xl:col-span-1">
                <SectionTitle title="Template Performance" info={METRIC_HELP.templatePerformance} />
                <div className="max-h-48 overflow-y-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="text-gray-500">
                        <th className="py-1 text-left">Template</th>
                        <th className="py-1 text-right"><LabelWithInfo label="Resp%" info={METRIC_HELP.templateRespRate} /></th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.templateStats.rows.slice(0, 8).map((t) => (
                        <tr key={t.templateName} className="border-t border-white/5">
                          <td className="max-w-[100px] truncate py-1.5 font-mono text-blue-400">{t.templateName}</td>
                          <td className="py-1.5 text-right text-gray-300">{t.responseRate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            {/* Segmentation */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {[
                { title: "Owner vs Guest", stats: data.ownerGuestStats, info: METRIC_HELP.ownerGuest },
                { title: "Rental Type", stats: data.rentalTypeStats, info: METRIC_HELP.rentalType },
              ].map(({ title, stats, info }) => (
                <Card key={title} className="p-4">
                  <SectionTitle title={title} info={info} />
                  <div className="space-y-3">
                    {stats.map((s) => (
                      <div key={s.label}>
                        <div className="mb-1 flex flex-wrap justify-between gap-x-2 gap-y-0.5 text-xs">
                          <span className="text-white">{s.label}</span>
                          <span className="flex flex-wrap items-center gap-x-2 text-gray-400">
                            <span className="inline-flex items-center gap-0.5">Resp {s.responseRate}%<MetricInfo text={METRIC_HELP.responseRate} /></span>
                            <span className="inline-flex items-center gap-0.5">Eng {s.engagementRate}%<MetricInfo text={METRIC_HELP.engagementRate} /></span>
                            <span className="inline-flex items-center gap-0.5">Multi {s.multiReplyRate}%<MetricInfo text={METRIC_HELP.multiReplyRate} /></span>
                          </span>
                        </div>
                        <RateBar rate={s.responseRate} />
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>

            {/* Row 4 — Sales funnel */}
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              <FunnelCard label="Reply → Visit" value={`${data.funnel.replyToVisitRate}%`} sub={`${data.funnel.visits} visits`} info={METRIC_HELP.replyToVisit} />
              <FunnelCard label="Visit → Good To Go" value={`${data.funnel.visitToGoodToGoRate}%`} sub={`${data.funnel.goodToGo} GTG`} info={METRIC_HELP.visitToGoodToGo} />
              <FunnelCard label="GTG → Booking" value={`${data.funnel.goodToGoToBookingRate}%`} sub={`${data.funnel.bookings} bookings`} info={METRIC_HELP.goodToGoToBooking} />
              <FunnelCard label="Reply → Booking" value={`${data.funnel.replyToBookingRate}%`} sub="end-to-end conversion" info={METRIC_HELP.replyToBooking} />
            </div>

            {/* Dimension table / map */}
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
                <div className="flex items-center gap-1 overflow-x-auto">
                  <span className="mr-1 inline-flex items-center gap-1 text-[10px] text-gray-600">
                    View By
                    <MetricInfo
                      text={
                        dimension === "Location"
                          ? METRIC_HELP.viewByLocation
                          : dimension === "Owner / Guests"
                            ? METRIC_HELP.viewByOwnerGuest
                            : dimension === "Rental Type"
                              ? METRIC_HELP.viewByRentalType
                              : dimension === "Agent"
                                ? METRIC_HELP.viewByAgent
                                : METRIC_HELP.viewByTemplate
                      }
                    />
                  </span>
                  {DIMENSIONS.map((d) => (
                    <button
                      key={d}
                      onClick={() => setDimension(d)}
                      className="whitespace-nowrap rounded-md px-2.5 py-1 text-[11px]"
                      style={{
                        background: dimension === d ? "rgba(99,102,241,0.2)" : "transparent",
                        color: dimension === d ? "#818cf8" : "#6b7280",
                        border: dimension === d ? "1px solid rgba(99,102,241,0.3)" : "1px solid transparent",
                      }}
                    >
                      {d}
                    </button>
                  ))}
                </div>
                {dimension === "Location" && (
                  <div className="flex rounded-lg border p-0.5" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                    {(["list", "map"] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => {
                          setViewMode(mode);
                          localStorage.setItem("wa_analytics_view", mode);
                        }}
                        className="flex items-center gap-1 rounded px-2.5 py-1 text-[11px]"
                        style={{
                          background: viewMode === mode ? "rgba(255,255,255,0.08)" : "transparent",
                          color: viewMode === mode ? "#fff" : "#6b7280",
                        }}
                      >
                        {mode === "list" ? <List size={12} /> : <Map size={12} />}
                        {mode === "list" ? "List" : "Map"}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="overflow-x-auto p-2">
                {dimension === "Location" && viewMode === "map" && (
                  <EuropeMap locationStats={data.locationMapRows} />
                )}
                {dimension === "Location" && viewMode === "list" && (
                  <>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-gray-500">
                          <th className="px-2 py-2 text-left font-medium">Location</th>
                          <th className="px-2 py-2 text-left font-medium"><LabelWithInfo label="Outbound" info={METRIC_HELP.outbound} /></th>
                          <th className="px-2 py-2 text-left font-medium"><LabelWithInfo label="Responded" info={METRIC_HELP.responded} /></th>
                          <th className="px-2 py-2 text-left font-medium"><LabelWithInfo label="Resp%" info={METRIC_HELP.responseRate} /></th>
                          <th className="px-2 py-2 text-left font-medium"><LabelWithInfo label="Visit%" info={METRIC_HELP.visitRate} /></th>
                          <th className="px-2 py-2 text-left font-medium"><LabelWithInfo label="Book%" info={METRIC_HELP.bookingRate} /></th>
                          <th className="px-2 py-2 text-left font-medium"><LabelWithInfo label="Hot" info={METRIC_HELP.hotLeadsCol} /></th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.locationStats.rows.map((r) => (
                          <tr key={r.locationKey} className="border-t border-white/5">
                            <td className="px-2 py-2 font-medium text-white">{r.location}</td>
                            <td className="px-2 py-2 text-gray-400">{r.outbound}</td>
                            <td className="px-2 py-2 text-gray-400">{r.responded}</td>
                            <td className="px-2 py-2"><RateBar rate={r.responseRate} /></td>
                            <td className="px-2 py-2 text-gray-400">{r.visitRate}%</td>
                            <td className="px-2 py-2 text-gray-400">{r.bookingRate}%</td>
                            <td className="px-2 py-2 text-gray-400">{r.hotLeads}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {locationTotalPages > 1 && (
                      <div className="mt-2 flex justify-between px-2 text-[11px] text-gray-500">
                        <span>Page {locationPage} / {locationTotalPages}</span>
                        <div className="flex gap-1">
                          <button disabled={locationPage <= 1} onClick={() => { setLocationPage((p) => p - 1); void fetchData({ lp: locationPage - 1 }); }}><ChevronLeft size={14} /></button>
                          <button disabled={locationPage >= locationTotalPages} onClick={() => { setLocationPage((p) => p + 1); void fetchData({ lp: locationPage + 1 }); }}><ChevronRight size={14} /></button>
                        </div>
                      </div>
                    )}
                  </>
                )}
                {dimension === "Owner / Guests" && (
                  <SegmentTable stats={data.ownerGuestStats} />
                )}
                {dimension === "Rental Type" && (
                  <SegmentTable stats={data.rentalTypeStats} />
                )}
                {dimension === "Agent" && (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-gray-500">
                        <th className="px-2 py-2 text-left">Agent</th>
                        <th className="px-2 py-2 text-left">Convs</th>
                        <th className="px-2 py-2 text-left"><LabelWithInfo label="Resp%" info={METRIC_HELP.agentRespRate} /></th>
                        <th className="px-2 py-2 text-left"><LabelWithInfo label="Avg Agent Reply" info={METRIC_HELP.avgAgentReply} /></th>
                        <th className="px-2 py-2 text-left"><LabelWithInfo label="SLA%" info={METRIC_HELP.agentSla} /></th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.agentStats.map((a) => (
                        <tr key={a.agentId} className="border-t border-white/5">
                          <td className="px-2 py-2 text-white">{a.name}</td>
                          <td className="px-2 py-2 text-gray-400">{a.conversations}</td>
                          <td className="px-2 py-2"><RateBar rate={a.responseRate} /></td>
                          <td className="px-2 py-2 text-gray-400">{Math.round(a.avgAgentReplyMs / 60000)}m</td>
                          <td className="px-2 py-2 text-gray-400">{a.slaMetPct}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {dimension === "Template" && (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-gray-500">
                        <th className="px-2 py-2 text-left">Template</th>
                        <th className="px-2 py-2 text-left"><LabelWithInfo label="Sent" info={METRIC_HELP.templateSent} /></th>
                        <th className="px-2 py-2 text-left"><LabelWithInfo label="Delivered" info={METRIC_HELP.templateDelivered} /></th>
                        <th className="px-2 py-2 text-left"><LabelWithInfo label="Read" info={METRIC_HELP.templateRead} /></th>
                        <th className="px-2 py-2 text-left"><LabelWithInfo label="Responded" info={METRIC_HELP.responded} /></th>
                        <th className="px-2 py-2 text-left"><LabelWithInfo label="Resp%" info={METRIC_HELP.templateRespRate} /></th>
                        <th className="px-2 py-2 text-left"><LabelWithInfo label="Avg Reply" info={METRIC_HELP.templateAvgReply} /></th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.templateStats.rows.map((t) => (
                        <tr key={t.templateName} className="border-t border-white/5">
                          <td className="max-w-[140px] truncate px-2 py-2 font-mono text-blue-400">{t.templateName}</td>
                          <td className="px-2 py-2 text-gray-400">{t.sent}</td>
                          <td className="px-2 py-2 text-gray-400">{t.delivered}</td>
                          <td className="px-2 py-2 text-gray-400">{t.read}</td>
                          <td className="px-2 py-2 text-gray-400">{t.responded}</td>
                          <td className="px-2 py-2"><RateBar rate={t.responseRate} /></td>
                          <td className="px-2 py-2 text-gray-400">{Math.round(t.avgReplyMs / 60000)}m</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </Card>

            {/* Call analytics */}
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs text-gray-400">
                <BarChart3 size={13} />
                Call Analytics
                <MetricInfo text={METRIC_HELP.callAnalytics} />
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <CallStatCard label="Connected" value={data.callStats.connected} info={METRIC_HELP.callConnected} />
                <CallStatCard label="Missed" value={data.callStats.missed} info={METRIC_HELP.callMissed} />
                <CallStatCard label="Declined" value={data.callStats.declined} info={METRIC_HELP.callDeclined} />
                <CallStatCard label="Avg Duration" value={`${data.callStats.avgDurationSeconds}s`} info={METRIC_HELP.callAvgDuration} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </TooltipProvider>
  );
}

function SegmentTable({
  stats,
}: {
  stats: WhatsAppOverviewResponse["ownerGuestStats"];
}) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-gray-500">
          <th className="px-2 py-2 text-left">Segment</th>
          <th className="px-2 py-2 text-left"><LabelWithInfo label="Outbound" info={METRIC_HELP.outbound} /></th>
          <th className="px-2 py-2 text-left"><LabelWithInfo label="Responded" info={METRIC_HELP.responded} /></th>
          <th className="px-2 py-2 text-left"><LabelWithInfo label="Resp%" info={METRIC_HELP.responseRate} /></th>
          <th className="px-2 py-2 text-left"><LabelWithInfo label="Engagement%" info={METRIC_HELP.engagementRate} /></th>
          <th className="px-2 py-2 text-left"><LabelWithInfo label="Multi Reply%" info={METRIC_HELP.multiReplyRate} /></th>
        </tr>
      </thead>
      <tbody>
        {stats.map((s) => (
          <tr key={s.label} className="border-t border-white/5">
            <td className="px-2 py-2 text-white">{s.label}</td>
            <td className="px-2 py-2 text-gray-400">{s.outbound}</td>
            <td className="px-2 py-2 text-gray-400">{s.responded}</td>
            <td className="px-2 py-2"><RateBar rate={s.responseRate} /></td>
            <td className="px-2 py-2 text-gray-400">{s.engagementRate}%</td>
            <td className="px-2 py-2 text-gray-400">{s.multiReplyRate}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
