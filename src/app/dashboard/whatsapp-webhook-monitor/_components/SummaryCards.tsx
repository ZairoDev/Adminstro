"use client";

import { AlertTriangle, CheckCircle2, Inbox, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WebhookMonitorSummary } from "@/lib/whatsapp/webhookLog/monitorService";
import { formatDateTime, timeAgo } from "../_lib/format";

type CardProps = {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "danger" | "warn" | "good";
  icon: React.ReactNode;
};

function Card({ label, value, hint, tone = "default", icon }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        tone === "danger" && "border-red-500/50 bg-red-500/5",
        tone === "warn" && "border-amber-500/50 bg-amber-500/5",
        tone === "good" && "border-emerald-500/40 bg-emerald-500/5",
      )}
    >
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        {icon}
      </div>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function SummaryCards({ summary }: { summary: WebhookMonitorSummary }) {
  const stored =
    (summary.inboundByProcessing.saved ?? 0) +
    (summary.inboundByProcessing.duplicate ?? 0);
  const notStored =
    (summary.inboundByProcessing.dropped ?? 0) +
    (summary.inboundByProcessing.error ?? 0) +
    summary.inboundStalePending;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          label="Inbound messages received"
          value={summary.inboundTotal}
          hint={`Last inbound: ${timeAgo(summary.lastInboundAt)}`}
          icon={<Inbox className="h-4 w-4" />}
        />
        <Card
          label="Stored OK"
          value={stored}
          tone="good"
          hint="saved + Meta retries (duplicates)"
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <Card
          label="NOT stored (lost)"
          value={notStored}
          tone={notStored > 0 ? "danger" : "default"}
          hint={`${summary.customersWithLostInbound} customer(s) affected`}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <Card
          label="Rejected signatures"
          value={summary.invalidSignatureCount}
          tone={summary.invalidSignatureCount > 0 ? "danger" : "default"}
          hint="403 sent to Meta — retried, never processed"
          icon={<ShieldAlert className="h-4 w-4" />}
        />
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
        <span>Last webhook of any kind: {timeAgo(summary.lastWebhookAt)}</span>
        <span>Logging started: {formatDateTime(summary.coverageStartedAt)}</span>
        {summary.savedWithoutNotification > 0 && (
          <span className="text-amber-600">
            {summary.savedWithoutNotification} stored but no employee was
            notified
          </span>
        )}
      </div>

      {summary.dropReasons.length > 0 && (
        <div className="rounded-lg border border-red-500/30 p-3">
          <p className="mb-2 text-sm font-medium">Why messages were not stored</p>
          <ul className="space-y-1 text-xs">
            {summary.dropReasons.map((r) => (
              <li key={r.reason} className="flex justify-between gap-4">
                <code className="break-all">{r.reason}</code>
                <span className="tabular-nums font-semibold">{r.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
