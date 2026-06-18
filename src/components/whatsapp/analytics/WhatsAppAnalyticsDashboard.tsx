"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import {
  MessageSquare,
  CheckCheck,
  Clock,
  Activity,
  Phone,
  PhoneOff,
  PhoneMissed,
  Timer,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  List,
  Map,
  Users,
  BarChart3,
  Layers,
} from "lucide-react";
import type {
  WhatsAppOverviewResponse,
  KpiStats,
  SegmentStat,
  FunnelStep,
  LocationStat,
  AgentStat,
  TemplateStat,
  CallStats,
} from "@/app/api/analytics/whatsapp-overview/route";
const EuropeMap = dynamic(() => import("./EuropeMap"), {
  ssr: false,
  loading: () => (
    <div
      className="flex h-64 items-center justify-center rounded-lg text-xs text-gray-600"
      style={{ background: "#0d1117" }}
    >
      Loading map…
    </div>
  ),
});

// ── Utility ──────────────────────────────────────────────────────────────────
function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtMinutes(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function fmtSeconds(secs: number): string {
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

const PERIODS = [
  { value: "this_month", label: "This Month" },
  { value: "last_30_days", label: "Last 30 Days" },
  { value: "last_7_days", label: "Last 7 Days" },
  { value: "last_month", label: "Last Month" },
] as const;
type Period = (typeof PERIODS)[number]["value"];

const DIMENSIONS = ["Location", "Owner / Guests", "Rental Type", "Agent", "Template"] as const;
type Dimension = (typeof DIMENSIONS)[number];

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl border px-4 py-3"
      style={{
        background: "#0d1117",
        borderColor: "rgba(255,255,255,0.08)",
      }}
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ background: "rgba(255,255,255,0.06)" }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-gray-500 truncate">{label}</p>
        <p className="text-xl font-semibold text-white leading-tight">{value}</p>
        {sub && <p className="text-[10px] text-gray-600 truncate">{sub}</p>}
      </div>
    </div>
  );
}

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1.5 w-full rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
      <div
        className="h-1.5 rounded-full transition-all duration-300"
        style={{ width: `${Math.min(100, pct)}%`, background: color }}
      />
    </div>
  );
}

function SegmentCard({ stats, title }: { stats: SegmentStat[]; title: string }) {
  const total = stats.reduce((s, r) => s + r.total, 0);
  return (
    <div
      className="rounded-xl border p-4"
      style={{ background: "#0d1117", borderColor: "rgba(255,255,255,0.08)" }}
    >
      <p className="mb-3 text-xs font-medium text-gray-400">{title}</p>
      <div className="space-y-3">
        {stats.map((seg) => (
          <div key={seg.label}>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs text-white">{seg.label}</span>
              <span className="text-xs font-semibold text-white">
                {seg.replyRate}%{" "}
                <span className="font-normal text-gray-500">({fmt(seg.total)})</span>
              </span>
            </div>
            <ProgressBar
              pct={total > 0 ? (seg.total / total) * 100 : 0}
              color={seg.replyRate >= 70 ? "#22c55e" : seg.replyRate >= 40 ? "#f59e0b" : "#ef4444"}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function FunnelCards({ steps }: { steps: FunnelStep[] }) {
  const colors = ["#6366f1", "#3b82f6", "#8b5cf6", "#22c55e"];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {steps.map((s, i) => (
        <div
          key={s.label}
          className="rounded-xl border px-3 py-3"
          style={{ background: "#0d1117", borderColor: "rgba(255,255,255,0.08)" }}
        >
          <p className="text-[10px] text-gray-500 mb-1">{s.label}</p>
          <p className="text-lg font-semibold text-white">{fmt(s.count)}</p>
          <div className="mt-1.5">
            <ProgressBar pct={s.pct} color={colors[i]} />
            <p className="mt-0.5 text-[10px] text-gray-600">{s.pct}%</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function TrendIcon({ pct }: { pct: number }) {
  if (pct >= 70) return <TrendingUp size={14} className="text-green-500" />;
  if (pct >= 40) return <Minus size={14} className="text-yellow-500" />;
  return <TrendingDown size={14} className="text-red-500" />;
}

function RateBar({ rate }: { rate: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1 w-14 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
        <div
          className="h-1 rounded-full"
          style={{
            width: `${rate}%`,
            background: rate >= 70 ? "#22c55e" : rate >= 40 ? "#f59e0b" : "#ef4444",
          }}
        />
      </div>
      <span className="text-xs text-white">{rate}%</span>
    </div>
  );
}

// ── Dimension table views ─────────────────────────────────────────────────────

function LocationTable({
  data,
  page,
  totalPages,
  onPageChange,
}: {
  data: LocationStat[];
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              {[
                "Location", "Owners", "Guests", "Short T.", "Long T.", "Reply %", "Deliv %", "Avg Resp", "Trend",
              ].map((h) => (
                <th
                  key={h}
                  className="px-3 py-2 text-left text-gray-500 font-medium whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr
                key={row.locationKey}
                className="transition-colors"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLTableRowElement).style.background =
                    "rgba(255,255,255,0.03)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLTableRowElement).style.background = "";
                }}
              >
                <td className="px-3 py-2 font-medium text-white whitespace-nowrap">
                  {row.location}
                </td>
                <td className="px-3 py-2 text-gray-400">{row.ownerCount}</td>
                <td className="px-3 py-2 text-gray-400">{row.guestCount}</td>
                <td className="px-3 py-2 text-gray-400">{row.shortTermCount}</td>
                <td className="px-3 py-2 text-gray-400">{row.longTermCount}</td>
                <td className="px-3 py-2">
                  <RateBar rate={row.replyRate} />
                </td>
                <td className="px-3 py-2">
                  <RateBar rate={row.deliveryRate} />
                </td>
                <td className="px-3 py-2 text-gray-400 whitespace-nowrap">
                  {fmtMinutes(row.avgResponseMinutes)}
                </td>
                <td className="px-3 py-2">
                  <TrendIcon pct={row.replyRate} />
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="px-3 py-6 text-center text-gray-600"
                >
                  No data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between px-2 text-xs text-gray-500">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="rounded p-1 hover:bg-white/5 disabled:opacity-30"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="rounded p-1 hover:bg-white/5 disabled:opacity-30"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function OwnerGuestTable({ stats }: { stats: SegmentStat[] }) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          {["Type", "Total", "Replied", "Reply Rate"].map((h) => (
            <th key={h} className="px-3 py-2 text-left text-gray-500 font-medium">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {stats.map((seg) => (
          <tr key={seg.label} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <td className="px-3 py-2 font-medium text-white">{seg.label}</td>
            <td className="px-3 py-2 text-gray-400">{fmt(seg.total)}</td>
            <td className="px-3 py-2 text-gray-400">{fmt(seg.replied)}</td>
            <td className="px-3 py-2">
              <RateBar rate={seg.replyRate} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RentalTypeTable({ stats }: { stats: SegmentStat[] }) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          {["Rental Type", "Total", "Replied", "Reply Rate"].map((h) => (
            <th key={h} className="px-3 py-2 text-left text-gray-500 font-medium">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {stats.map((seg) => (
          <tr key={seg.label} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <td className="px-3 py-2 font-medium text-white">{seg.label}</td>
            <td className="px-3 py-2 text-gray-400">{fmt(seg.total)}</td>
            <td className="px-3 py-2 text-gray-400">{fmt(seg.replied)}</td>
            <td className="px-3 py-2">
              <RateBar rate={seg.replyRate} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AgentTable({ stats }: { stats: AgentStat[] }) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          {["#", "Agent", "Convs", "Replied", "Reply %", "Avg Resp"].map((h) => (
            <th key={h} className="px-3 py-2 text-left text-gray-500 font-medium">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {stats.map((a, i) => (
          <tr key={a.agentId} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <td className="px-3 py-2 text-gray-600">{i + 1}</td>
            <td className="px-3 py-2 font-medium text-white max-w-[120px] truncate">
              {a.name}
            </td>
            <td className="px-3 py-2 text-gray-400">{fmt(a.conversations)}</td>
            <td className="px-3 py-2 text-gray-400">{fmt(a.replied)}</td>
            <td className="px-3 py-2">
              <RateBar rate={a.replyRate} />
            </td>
            <td className="px-3 py-2 text-gray-400 whitespace-nowrap">
              {fmtMinutes(a.avgResponseMinutes)}
            </td>
          </tr>
        ))}
        {stats.length === 0 && (
          <tr>
            <td colSpan={6} className="px-3 py-6 text-center text-gray-600">
              No data
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function TemplateTable({
  stats,
  page,
  totalPages,
  onPageChange,
}: {
  stats: TemplateStat[];
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              {["Template", "Sent", "Delivered", "Deliv %", "Replied", "Reply %"].map((h) => (
                <th key={h} className="px-3 py-2 text-left text-gray-500 font-medium whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stats.map((t) => (
              <tr key={t.templateName} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <td className="px-3 py-2 font-mono text-[10px] text-blue-400 max-w-[160px] truncate">
                  {t.templateName}
                </td>
                <td className="px-3 py-2 text-gray-400">{fmt(t.sent)}</td>
                <td className="px-3 py-2 text-gray-400">{fmt(t.delivered)}</td>
                <td className="px-3 py-2">
                  <RateBar rate={t.deliveryRate} />
                </td>
                <td className="px-3 py-2 text-gray-400">{fmt(t.replied)}</td>
                <td className="px-3 py-2">
                  <RateBar rate={t.replyRate} />
                </td>
              </tr>
            ))}
            {stats.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-gray-600">
                  No data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-between px-2 text-xs text-gray-500">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="rounded p-1 hover:bg-white/5 disabled:opacity-30"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="rounded p-1 hover:bg-white/5 disabled:opacity-30"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Leaderboard({ allRows }: { allRows: LocationStat[] }) {
  const sorted = [...allRows].sort((a, b) => b.replyRate - a.replyRate);
  const top = sorted.slice(0, 5);
  const bottom = sorted.slice(-5).reverse();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {[
        { title: "Top Performing", items: top, positive: true },
        { title: "Bottom Performing", items: bottom, positive: false },
      ].map(({ title, items, positive }) => (
        <div
          key={title}
          className="rounded-xl border p-4"
          style={{ background: "#0d1117", borderColor: "rgba(255,255,255,0.08)" }}
        >
          <p className="mb-3 text-xs font-medium text-gray-400">{title}</p>
          <div className="space-y-2">
            {items.map((r, i) => (
              <div key={r.locationKey} className="flex items-center gap-2">
                <span className="w-4 text-[10px] text-gray-600">{i + 1}</span>
                <span className="flex-1 text-xs text-white truncate">{r.location}</span>
                <span
                  className="text-xs font-semibold"
                  style={{ color: positive ? "#22c55e" : "#ef4444" }}
                >
                  {r.replyRate}%
                </span>
              </div>
            ))}
            {items.length === 0 && (
              <p className="text-xs text-gray-600">No data</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function CallKpis({ stats }: { stats: CallStats }) {
  const items = [
    { icon: <Phone size={14} className="text-green-400" />, label: "Connected", value: fmt(stats.connected) },
    { icon: <PhoneMissed size={14} className="text-yellow-400" />, label: "Missed", value: fmt(stats.missed) },
    { icon: <PhoneOff size={14} className="text-red-400" />, label: "Declined", value: fmt(stats.declined) },
    { icon: <Timer size={14} className="text-blue-400" />, label: "Avg Duration", value: fmtSeconds(stats.avgDurationSeconds) },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map((it) => (
        <div
          key={it.label}
          className="rounded-xl border px-3 py-3"
          style={{ background: "#0d1117", borderColor: "rgba(255,255,255,0.08)" }}
        >
          <div className="mb-1 flex items-center gap-1.5">
            {it.icon}
            <span className="text-[10px] text-gray-500">{it.label}</span>
          </div>
          <p className="text-lg font-semibold text-white">{it.value}</p>
        </div>
      ))}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-16 rounded-xl"
            style={{ background: "rgba(255,255,255,0.05)" }}
          />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-xl"
            style={{ background: "rgba(255,255,255,0.05)" }}
          />
        ))}
      </div>
      <div className="h-64 rounded-xl" style={{ background: "rgba(255,255,255,0.05)" }} />
    </div>
  );
}

// ── Main dashboard ─────────────────────────────────────────────────────────────
export default function WhatsAppAnalyticsDashboard() {
  const [data, setData] = useState<WhatsAppOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("this_month");
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
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      setError(null);
      try {
        const lp = opts?.lp ?? locationPage;
        const tp = opts?.tp ?? templatePage;
        const params = new URLSearchParams({
          period,
          locationPage: String(lp),
          templatePage: String(tp),
          ...(opts?.refresh ? { refresh: "true" } : {}),
        });
        const res = await fetch(`/api/analytics/whatsapp-overview?${params}`, {
          signal: ctrl.signal,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Unknown error" }));
          throw new Error(err.error ?? `HTTP ${res.status}`);
        }
        const json: WhatsAppOverviewResponse = await res.json();
        setData(json);
      } catch (e: unknown) {
        if (e instanceof Error && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    },
    [period, locationPage, templatePage],
  );

  useEffect(() => {
    setLocationPage(1);
    setTemplatePage(1);
  }, [period]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleViewMode = (mode: "list" | "map") => {
    setViewMode(mode);
    localStorage.setItem("wa_analytics_view", mode);
  };

  const handleLocationPage = (p: number) => {
    setLocationPage(p);
    void fetchData({ lp: p });
  };

  const handleTemplatePage = (p: number) => {
    setTemplatePage(p);
    void fetchData({ tp: p });
  };

  const locationTotalPages = data
    ? Math.ceil(data.locationStats.total / data.locationStats.pageSize)
    : 1;
  const templateTotalPages = data
    ? Math.ceil(data.templateStats.total / data.templateStats.pageSize)
    : 1;

  const kpi = data?.kpis;
  const allLocationRows = data?.locationMapRows ?? data?.locationStats.rows ?? [];

  return (
    <div
      className="min-h-screen"
      style={{ background: "#090c11", color: "#e5e7eb" }}
    >
      <div className="mx-auto max-w-screen-2xl px-4 py-5">
        {/* Header */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-semibold text-white">WhatsApp Analytics</h1>
            <p className="text-xs text-gray-500">
              Real-time performance across locations, rental types &amp; conversations
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Period selector */}
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as Period)}
              className="rounded-lg border px-3 py-1.5 text-xs text-white outline-none"
              style={{
                background: "#0d1117",
                borderColor: "rgba(255,255,255,0.12)",
              }}
            >
              {PERIODS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            {/* Refresh */}
            <button
              onClick={() => void fetchData({ refresh: true })}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              style={{ borderColor: "rgba(255,255,255,0.12)" }}
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            {data && (
              <span className="text-[10px] text-gray-600">
                Updated{" "}
                {new Date(data.generatedAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            className="mb-4 rounded-lg border px-4 py-3 text-sm text-red-400"
            style={{ borderColor: "rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.07)" }}
          >
            {error}
          </div>
        )}

        {loading && !data && <Skeleton />}

        {data && (
          <div className="space-y-4">
            {/* SECTION 1 — KPI Cards */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <KpiCard
                icon={<MessageSquare size={16} className="text-indigo-400" />}
                label="Reply Rate"
                value={`${kpi!.replyRate}%`}
                sub={`${fmt(kpi!.totalReplied)} replied`}
              />
              <KpiCard
                icon={<CheckCheck size={16} className="text-blue-400" />}
                label="Delivery Rate"
                value={`${kpi!.deliveryRate}%`}
                sub={`${fmt(kpi!.totalDelivered)} / ${fmt(kpi!.totalSent)}`}
              />
              <KpiCard
                icon={<Clock size={16} className="text-violet-400" />}
                label="Avg Response"
                value={fmtMinutes(kpi!.avgResponseMinutes)}
                sub="time to first reply"
              />
              <KpiCard
                icon={<Activity size={16} className="text-green-400" />}
                label="Active Convs"
                value={fmt(kpi!.activeConversations)}
                sub="currently open"
              />
            </div>

            {/* SECTION 2 — Segmentation */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <SegmentCard stats={data.ownerGuestStats} title="Owner vs Guest" />
              <SegmentCard stats={data.rentalTypeStats} title="By Rental Type" />
              {/* SECTION 3 — Funnel */}
              <div
                className="rounded-xl border p-4"
                style={{ background: "#0d1117", borderColor: "rgba(255,255,255,0.08)" }}
              >
                <p className="mb-3 text-xs font-medium text-gray-400">Reply Funnel</p>
                <div className="space-y-2">
                  {data.funnel.map((step, i) => {
                    const colors = ["#6366f1", "#3b82f6", "#8b5cf6", "#22c55e"];
                    return (
                      <div key={step.label}>
                        <div className="mb-0.5 flex items-center justify-between">
                          <span className="text-[11px] text-gray-400">{step.label}</span>
                          <span className="text-[11px] font-medium text-white">
                            {fmt(step.count)}{" "}
                            <span className="text-gray-600">({step.pct}%)</span>
                          </span>
                        </div>
                        <ProgressBar pct={step.pct} color={colors[i]} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* SECTION 4-5 — Performance Table / Map + Leaderboard */}
            <div
              className="rounded-xl border"
              style={{ background: "#0d1117", borderColor: "rgba(255,255,255,0.08)" }}
            >
              {/* Table header */}
              <div
                className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3"
                style={{ borderColor: "rgba(255,255,255,0.07)" }}
              >
                {/* Dimension tabs */}
                <div className="flex items-center gap-1 overflow-x-auto">
                  <span className="mr-1 text-[10px] text-gray-600 whitespace-nowrap">View By</span>
                  {DIMENSIONS.map((d) => (
                    <button
                      key={d}
                      onClick={() => setDimension(d)}
                      className="whitespace-nowrap rounded-md px-2.5 py-1 text-[11px] transition-colors"
                      style={{
                        background:
                          dimension === d ? "rgba(99,102,241,0.2)" : "transparent",
                        color: dimension === d ? "#818cf8" : "#6b7280",
                        border: dimension === d ? "1px solid rgba(99,102,241,0.3)" : "1px solid transparent",
                      }}
                    >
                      {d}
                    </button>
                  ))}
                </div>
                {/* View toggle (only for Location) */}
                {dimension === "Location" && (
                  <div
                    className="flex rounded-lg border p-0.5"
                    style={{ borderColor: "rgba(255,255,255,0.1)" }}
                  >
                    <button
                      onClick={() => handleViewMode("list")}
                      className="flex items-center gap-1 rounded px-2.5 py-1 text-[11px] transition-colors"
                      style={{
                        background: viewMode === "list" ? "rgba(255,255,255,0.08)" : "transparent",
                        color: viewMode === "list" ? "#fff" : "#6b7280",
                      }}
                    >
                      <List size={12} /> List
                    </button>
                    <button
                      onClick={() => handleViewMode("map")}
                      className="flex items-center gap-1 rounded px-2.5 py-1 text-[11px] transition-colors"
                      style={{
                        background: viewMode === "map" ? "rgba(255,255,255,0.08)" : "transparent",
                        color: viewMode === "map" ? "#fff" : "#6b7280",
                      }}
                    >
                      <Map size={12} /> Map
                    </button>
                  </div>
                )}
              </div>

              {/* Table body */}
              <div className="p-2">
                {dimension === "Location" && viewMode === "list" && (
                  <LocationTable
                    data={data.locationStats.rows}
                    page={locationPage}
                    totalPages={locationTotalPages}
                    onPageChange={handleLocationPage}
                  />
                )}
                {dimension === "Location" && viewMode === "map" && (
                  <EuropeMap locationStats={allLocationRows} />
                )}
                {dimension === "Owner / Guests" && (
                  <OwnerGuestTable stats={data.ownerGuestStats} />
                )}
                {dimension === "Rental Type" && (
                  <RentalTypeTable stats={data.rentalTypeStats} />
                )}
                {dimension === "Agent" && (
                  <AgentTable stats={data.agentStats} />
                )}
                {dimension === "Template" && (
                  <TemplateTable
                    stats={data.templateStats.rows}
                    page={templatePage}
                    totalPages={templateTotalPages}
                    onPageChange={handleTemplatePage}
                  />
                )}
              </div>
            </div>

            {/* SECTION 5 — Leaderboard (only when Location view) */}
            {dimension === "Location" && allLocationRows.length > 0 && (
              <Leaderboard allRows={allLocationRows} />
            )}

            {/* SECTION 6 — Agent Performance (compact) */}
            {data.agentStats.length > 0 && dimension !== "Agent" && (
              <div
                className="rounded-xl border"
                style={{ background: "#0d1117", borderColor: "rgba(255,255,255,0.08)" }}
              >
                <div
                  className="flex items-center gap-2 border-b px-4 py-2.5"
                  style={{ borderColor: "rgba(255,255,255,0.07)" }}
                >
                  <Users size={13} className="text-gray-500" />
                  <span className="text-xs font-medium text-gray-400">
                    Agent Performance
                  </span>
                </div>
                <div className="p-2">
                  <AgentTable stats={data.agentStats.slice(0, 10)} />
                </div>
              </div>
            )}

            {/* SECTION 7 — Template Performance (compact) */}
            {data.templateStats.rows.length > 0 && dimension !== "Template" && (
              <div
                className="rounded-xl border"
                style={{ background: "#0d1117", borderColor: "rgba(255,255,255,0.08)" }}
              >
                <div
                  className="flex items-center gap-2 border-b px-4 py-2.5"
                  style={{ borderColor: "rgba(255,255,255,0.07)" }}
                >
                  <Layers size={13} className="text-gray-500" />
                  <span className="text-xs font-medium text-gray-400">
                    Template Performance
                  </span>
                </div>
                <div className="p-2">
                  <TemplateTable
                    stats={data.templateStats.rows}
                    page={templatePage}
                    totalPages={templateTotalPages}
                    onPageChange={handleTemplatePage}
                  />
                </div>
              </div>
            )}

            {/* SECTION 8 — Call Analytics */}
            <div>
              <div className="mb-2 flex items-center gap-2">
                <BarChart3 size={13} className="text-gray-500" />
                <span className="text-xs font-medium text-gray-400">Call Analytics</span>
                <span className="text-[10px] text-gray-600">
                  Total: {fmt(data.callStats.total)}
                </span>
              </div>
              <CallKpis stats={data.callStats} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
