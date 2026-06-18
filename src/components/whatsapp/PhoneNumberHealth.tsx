"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Activity,
  BarChart3,
  Link2,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Phone,
  Plus,
  RefreshCw,
  ScrollText,
  Users,
  Wifi,
} from "lucide-react";
import axios from "@/util/axios";
import { useAuthStore } from "@/AuthStore";
import { cn } from "@/lib/utils";

type ConnectionLabel = "Connected" | "Warning" | "Disconnected" | "Unknown";

interface PhoneHealthMetrics {
  phoneNumberId: string;
  channelId?: string;
  displayName: string;
  displayNumber: string;
  connectionLabel: ConnectionLabel;
  healthPercent: number | null;
  chatsToday: number;
  dataSourceStatus?: "LIVE" | "CACHED" | "STALE" | "NOT_SYNCED";
}

interface PhoneHealthSummary {
  connectedCount: number;
  totalChatsToday: number;
  activeAgents: number;
  avgHealthPercent: number | null;
}

const STATUS_DOT: Record<ConnectionLabel, string> = {
  Connected: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]",
  Warning: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]",
  Disconnected: "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.5)]",
  Unknown: "bg-zinc-500",
};

const STATUS_BADGE: Record<ConnectionLabel, string> = {
  Connected: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  Warning: "bg-amber-500/15 text-amber-300 border-amber-500/25",
  Disconnected: "bg-red-500/15 text-red-300 border-red-500/25",
  Unknown: "bg-zinc-500/15 text-zinc-400 border-zinc-500/25",
};

function formatCount(value: number): string {
  return value.toLocaleString("en-US");
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Wifi;
  label: string;
  value: string;
}) {
  return (
    <div
      className="flex h-[70px] items-center gap-3 rounded-[14px] border border-white/[0.08] bg-gradient-to-br from-[#111827] to-[#0f172a] px-4"
      style={{ backgroundColor: "#111827" }}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-[#00a884]">
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{label}</p>
        <p className="text-xl font-semibold tabular-nums text-zinc-100">{value}</p>
      </div>
    </div>
  );
}

function NumberCardSkeleton() {
  return (
    <div
      className="flex h-[132px] animate-pulse flex-col gap-3 rounded-[14px] border border-white/[0.08] p-3.5"
      style={{ backgroundColor: "#111827" }}
    >
      <div className="flex justify-between">
        <div className="h-4 w-2/3 rounded bg-white/10" />
        <div className="h-4 w-4 rounded bg-white/10" />
      </div>
      <div className="h-3 w-1/2 rounded bg-white/10" />
      <div className="h-3 w-1/3 rounded bg-white/10" />
      <div className="mt-auto flex justify-between">
        <div className="h-5 w-16 rounded-full bg-white/10" />
        <div className="h-4 w-10 rounded bg-white/10" />
      </div>
    </div>
  );
}

function NumberCard({ metric }: { metric: PhoneHealthMetrics }) {
  const channelsUrl = metric.channelId
    ? `/dashboard/whatsapp/channels`
    : "/dashboard/whatsapp/channels";
  const inboxUrl = `/whatsapp`;

  return (
    <article
      className={cn(
        "group relative flex flex-col gap-3 overflow-hidden rounded-[14px] border border-white/[0.08] p-3.5",
        "transition-all duration-200 hover:-translate-y-0.5 hover:border-[#00a884]/30 hover:shadow-[0_8px_30px_rgba(0,168,132,0.12)]",
      )}
      style={{ backgroundColor: "#111827" }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn("h-2 w-2 shrink-0 rounded-full", STATUS_DOT[metric.connectionLabel])}
            aria-hidden
          />
          <h3 className="truncate text-sm font-medium text-zinc-100">{metric.displayName}</h3>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 shrink-0 p-0 text-zinc-500 hover:bg-white/10 hover:text-zinc-200"
              aria-label={`Actions for ${metric.displayName}`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="border-white/10 bg-[#111827] text-zinc-200"
          >
            <DropdownMenuItem asChild className="focus:bg-white/10 focus:text-zinc-100">
              <Link href={inboxUrl}>
                <BarChart3 className="mr-2 h-3.5 w-3.5" />
                View Analytics
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="focus:bg-white/10 focus:text-zinc-100">
              <Link href={channelsUrl}>
                <Link2 className="mr-2 h-3.5 w-3.5" />
                Reconnect
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="focus:bg-white/10 focus:text-zinc-100">
              <Link href={channelsUrl}>
                <MapPin className="mr-2 h-3.5 w-3.5" />
                Assign Location
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="focus:bg-white/10 focus:text-zinc-100">
              <Link href="/whatsapp">
                <ScrollText className="mr-2 h-3.5 w-3.5" />
                View Logs
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <p className="truncate text-xs tabular-nums text-zinc-400">{metric.displayNumber}</p>

      <div className="flex items-center gap-1.5 text-xs text-zinc-400">
        <MessageCircle className="h-3.5 w-3.5 shrink-0 text-[#00a884]" aria-hidden />
        <span>
          <span className="font-medium text-zinc-200">{formatCount(metric.chatsToday)}</span>
          {" Chats Today"}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
            STATUS_BADGE[metric.connectionLabel],
          )}
        >
          {metric.connectionLabel}
        </span>
        <span className="text-sm font-semibold tabular-nums text-zinc-200">
          {metric.healthPercent !== null ? `${metric.healthPercent}%` : "—"}
        </span>
      </div>

      <div
        className={cn(
          "absolute inset-x-0 bottom-0 flex translate-y-full gap-1 border-t border-white/[0.08] bg-[#0d1320]/95 p-2 backdrop-blur-sm",
          "transition-transform duration-200 group-hover:translate-y-0",
        )}
      >
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="h-7 flex-1 text-[10px] text-zinc-300 hover:bg-white/10 hover:text-white"
        >
          <Link href={inboxUrl}>Analytics</Link>
        </Button>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="h-7 flex-1 text-[10px] text-zinc-300 hover:bg-white/10 hover:text-white"
        >
          <Link href={channelsUrl}>Reconnect</Link>
        </Button>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="h-7 flex-1 text-[10px] text-zinc-300 hover:bg-white/10 hover:text-white"
        >
          <Link href={channelsUrl}>Location</Link>
        </Button>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="h-7 flex-1 text-[10px] text-zinc-300 hover:bg-white/10 hover:text-white"
        >
          <Link href="/whatsapp">Logs</Link>
        </Button>
      </div>
    </article>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4 rounded-2xl border border-white/[0.08] bg-[#0b0f17] p-4 sm:p-5">
      <div className="flex justify-between gap-4">
        <div className="space-y-2">
          <div className="h-6 w-32 animate-pulse rounded bg-white/10" />
          <div className="h-3 w-64 animate-pulse rounded bg-white/10" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-20 animate-pulse rounded-lg bg-white/10" />
          <div className="h-9 w-28 animate-pulse rounded-lg bg-white/10" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-[70px] animate-pulse rounded-[14px] border border-white/[0.08] bg-white/5"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <NumberCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function PhoneNumberHealth() {
  const [metrics, setMetrics] = useState<PhoneHealthMetrics[]>([]);
  const [summary, setSummary] = useState<PhoneHealthSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuthStore();
  const isSuperAdmin = token?.role === "SuperAdmin";
  const canManageChannels = ["SuperAdmin", "Admin", "Developer"].includes(token?.role ?? "");

  const fetchHealthMetrics = useCallback(async (forceRefresh = false) => {
    try {
      if (forceRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const url = forceRefresh
        ? "/api/whatsapp/phone-health?refresh=true"
        : "/api/whatsapp/phone-health";
      const response = await axios.get(url);
      if (response.data.success) {
        setMetrics(response.data.metrics || []);
        setSummary(response.data.summary || null);
      } else {
        setError("Failed to load line health");
      }
    } catch (err: unknown) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.error
          ? String(err.response.data.error)
          : "Failed to load line health";
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHealthMetrics(false);
  }, [fetchHealthMetrics]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-[#111827] p-6 text-center">
        <p className="text-sm text-red-300">{error}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3 border-white/10 bg-transparent text-zinc-200 hover:bg-white/10"
          onClick={() => fetchHealthMetrics(false)}
        >
          Retry
        </Button>
      </div>
    );
  }

  if (metrics.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-[#111827] px-6 py-12 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#00a884]/10">
          <Phone className="h-7 w-7 text-[#00a884]" aria-hidden />
        </div>
        <p className="text-sm font-medium text-zinc-200">No WhatsApp numbers connected yet</p>
        <p className="mt-1 text-xs text-zinc-500">
          Connect a channel to monitor health, chats, and agent activity.
        </p>
        {canManageChannels ? (
          <Button
            asChild
            className="mt-5 bg-[#00a884] text-white hover:bg-[#008069]"
          >
            <Link href="/dashboard/whatsapp/channels">
              <Plus className="mr-2 h-4 w-4" />
              Add First Number
            </Link>
          </Button>
        ) : null}
      </div>
    );
  }

  const connected = summary?.connectedCount ?? metrics.filter((m) => m.connectionLabel === "Connected").length;
  const totalChats = summary?.totalChatsToday ?? metrics.reduce((s, m) => s + m.chatsToday, 0);
  const activeAgents = summary?.activeAgents ?? 0;
  const avgHealth = summary?.avgHealthPercent;

  return (
    <section className="space-y-4 rounded-2xl border border-white/[0.08] bg-[#0b0f17] p-4 sm:p-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-zinc-100">Line Health</h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            Monitor all connected WhatsApp numbers, health status, and activity.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 border-white/10 bg-[#111827] text-zinc-200 hover:bg-white/10 hover:text-white"
            onClick={() => fetchHealthMetrics(isSuperAdmin)}
            disabled={refreshing}
          >
            <RefreshCw className={cn("mr-2 h-3.5 w-3.5", refreshing && "animate-spin")} />
            Refresh
          </Button>
          {canManageChannels ? (
            <Button
              asChild
              size="sm"
              className="h-9 bg-[#00a884] text-white hover:bg-[#008069]"
            >
              <Link href="/dashboard/whatsapp/channels">
                <Plus className="mr-2 h-3.5 w-3.5" />
                Add Number
              </Link>
            </Button>
          ) : null}
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Wifi} label="Connected" value={formatCount(connected)} />
        <StatCard icon={MessageCircle} label="Total Chats" value={formatCount(totalChats)} />
        <StatCard icon={Users} label="Active Agents" value={formatCount(activeAgents)} />
        <StatCard
          icon={Activity}
          label="Avg Health"
          value={avgHealth !== null && avgHealth !== undefined ? `${avgHealth}%` : "—"}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {metrics.map((metric) => (
          <NumberCard key={metric.phoneNumberId} metric={metric} />
        ))}
      </div>
    </section>
  );
}
