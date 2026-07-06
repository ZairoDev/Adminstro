"use client";

import { useCallback, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Webhook } from "lucide-react";
import axios from "@/util/axios";
import { cn } from "@/lib/utils";

type WebhookStats = {
  since: string;
  totalAll: number;
  phone?: string;
  phoneTotal: number;
  byStatus: Record<string, number>;
  byKind: Record<string, number>;
  recent: Array<{
    receivedAt: string;
    eventAt?: string;
    kind: string;
    status?: string;
    messageId?: string;
    field: string;
    customerPhone?: string;
  }>;
};

interface WebhookLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participantPhone: string;
}

export function WebhookLogDialog({
  open,
  onOpenChange,
  participantPhone,
}: WebhookLogDialogProps) {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<WebhookStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get<WebhookStats>(
        "/api/whatsapp/webhook-log/stats",
        { params: { phone: participantPhone, days: 7 } },
      );
      setStats(data);
    } catch (err: unknown) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.error
          ? String(err.response.data.error)
          : "Failed to load webhook stats";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [participantPhone]);

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (next && !stats && !loading) {
      void fetchStats();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Webhook activity
          </DialogTitle>
          <DialogDescription>
            Meta webhooks received for this number (last 7 days). Every status,
            inbound message, and echo is logged.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
          <span className="font-mono truncate">{participantPhone}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchStats()}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-2">Refresh</span>
          </Button>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {loading && !stats && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {stats && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="For this number"
                value={stats.phoneTotal}
                highlight
              />
              <StatCard label="All webhooks (7d)" value={stats.totalAll} />
            </div>

            {Object.keys(stats.byStatus).length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">By status</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(stats.byStatus).map(([status, count]) => (
                    <span
                      key={status}
                      className="text-xs px-2 py-1 rounded-full bg-muted capitalize"
                    >
                      {status}: {count}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {Object.keys(stats.byKind).length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">By type</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(stats.byKind).map(([kind, count]) => (
                    <span
                      key={kind}
                      className="text-xs px-2 py-1 rounded-full bg-muted"
                    >
                      {kind.replace(/_/g, " ")}: {count}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {stats.recent.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Recent</h4>
                <ul className="space-y-1.5 text-xs font-mono max-h-48 overflow-y-auto">
                  {stats.recent.map((row, i) => (
                    <li
                      key={`${row.receivedAt}-${i}`}
                      className="flex flex-wrap gap-x-2 gap-y-0.5 py-1 border-b border-border/50 last:border-0"
                    >
                      <span className="text-muted-foreground shrink-0">
                        {new Date(row.receivedAt).toLocaleString()}
                      </span>
                      <span className="capitalize">{row.kind}</span>
                      {row.status && (
                        <span className="text-[#008069]">{row.status}</span>
                      )}
                      {row.messageId && (
                        <span className="truncate max-w-[180px] text-muted-foreground">
                          {row.messageId}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {stats.phoneTotal === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No webhooks logged for this number in the last 7 days. Logging
                starts after deploy — send a message to generate events.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        highlight && "border-[#008069]/40 bg-[#008069]/5",
      )}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

interface WebhookLogButtonProps {
  participantPhone: string;
  className?: string;
}

export function WebhookLogButton({
  participantPhone,
  className,
}: WebhookLogButtonProps) {
  const [open, setOpen] = useState(false);

  if (!participantPhone) return null;

  return (
    <>
      <Button
        id="webhook-log-trigger"
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        title="Webhook activity"
        className={className}
      >
        <Webhook className="h-5 w-5" />
      </Button>
      <WebhookLogDialog
        open={open}
        onOpenChange={setOpen}
        participantPhone={participantPhone}
      />
    </>
  );
}
