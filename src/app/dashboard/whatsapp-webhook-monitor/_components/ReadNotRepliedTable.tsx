"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import axios from "@/util/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  ReadNotRepliedResult,
  ReadNotRepliedRow,
  ReadNotRepliedVerdict,
} from "@/lib/whatsapp/webhookLog/monitorService";
import { apiErrorMessage, formatDateTime, timeAgo } from "../_lib/format";

const VERDICT_META: Record<
  ReadNotRepliedVerdict,
  { label: string; help: string; className: string }
> = {
  webhook_received_not_stored: {
    label: "Reply reached us — NOT stored",
    help: "Meta delivered the customer's message to our webhook but it was dropped or failed. Real bug.",
    className: "bg-red-600 text-white hover:bg-red-600",
  },
  replied_on_other_conversation: {
    label: "Replied in another chat",
    help: "The customer's reply is stored under a different conversation (other line / duplicate chat).",
    className: "bg-amber-500 text-white hover:bg-amber-500",
  },
  no_inbound_webhook: {
    label: "Meta sent no reply",
    help: "No inbound webhook for this number since they read it. Call to confirm — if they say they replied, the problem is on Meta's side or a different number.",
    className: "bg-slate-600 text-white hover:bg-slate-600",
  },
  no_log_coverage: {
    label: "Read before logging",
    help: "The message was read before webhook logging existed, so we cannot tell.",
    className: "bg-slate-400 text-white hover:bg-slate-400",
  },
};

const VERDICTS = Object.keys(VERDICT_META) as ReadNotRepliedVerdict[];

const MIN_AGE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "0", label: "Any time since read" },
  { value: "60", label: "Read 1h+ ago" },
  { value: "240", label: "Read 4h+ ago" },
  { value: "1440", label: "Read 24h+ ago" },
];

function RowDetails({ row }: { row: ReadNotRepliedRow }) {
  return (
    <div className="space-y-1 text-[11px] text-muted-foreground">
      {row.lostInbound.map((l) => (
        <div key={l.messageId ?? l.receivedAt} className="text-red-600">
          Lost reply @ {formatDateTime(l.receivedAt)}
          {l.preview ? ` — “${l.preview}”` : ""} ·{" "}
          {l.reason ?? l.processingStatus ?? "unknown"}
        </div>
      ))}
      {row.otherConversation && (
        <div>
          Reply @ {formatDateTime(row.otherConversation.lastIncomingAt)} in{" "}
          <Link
            className="underline"
            href={`/whatsapp?conversation=${row.otherConversation.conversationId}`}
            target="_blank"
          >
            another conversation
          </Link>
        </div>
      )}
    </div>
  );
}

export function ReadNotRepliedTable({ days }: { days: number }) {
  const [rows, setRows] = useState<ReadNotRepliedRow[]>([]);
  const [meta, setMeta] = useState<ReadNotRepliedResult | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [phone, setPhone] = useState("");
  const [verdict, setVerdict] = useState("all");
  const [minAge, setMinAge] = useState("60");
  const [applied, setApplied] = useState({ phone: "", verdict: "all", minAge: "60" });

  const query = useMemo(() => {
    const q: Record<string, string | number> = {
      days,
      minAgeMinutes: applied.minAge,
    };
    if (applied.verdict !== "all") q.verdict = applied.verdict;
    if (applied.phone.trim()) q.phone = applied.phone.trim();
    return q;
  }, [days, applied]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get<ReadNotRepliedResult>(
        "/api/admin/whatsapp-webhook-monitor/read-not-replied",
        { params: { ...query, page, limit: 50 } },
      );
      setRows(data.rows);
      setMeta(data);
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to load list"));
    } finally {
      setLoading(false);
    }
  }, [query, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const apply = () => {
    setPage(1);
    setApplied({ phone, verdict, minAge });
  };

  const csvHref = `/api/admin/whatsapp-webhook-monitor/read-not-replied?${new URLSearchParams(
    { ...Object.fromEntries(Object.entries(query).map(([k, v]) => [k, String(v)])), format: "csv" },
  ).toString()}`;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Customers whose last message from us shows a WhatsApp <b>read</b>{" "}
        receipt, with no customer message stored afterwards. Each row is
        checked against the raw webhook log, so you can tell a customer who
        truly did not answer from a reply that never reached us.
      </p>

      {meta && (
        <div className="flex flex-wrap gap-2">
          {VERDICTS.map((v) => (
            <button
              key={v}
              type="button"
              title={VERDICT_META[v].help}
              onClick={() => {
                setVerdict(v);
                setPage(1);
                setApplied({ phone, verdict: v, minAge });
              }}
              className="rounded-full border px-3 py-1 text-xs hover:bg-muted"
            >
              {VERDICT_META[v].label}:{" "}
              <b className="tabular-nums">{meta.verdictCounts[v]}</b>
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-2 md:grid-cols-5">
        <Input
          placeholder="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && apply()}
        />
        <Select value={verdict} onValueChange={setVerdict}>
          <SelectTrigger>
            <SelectValue placeholder="Verdict" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All verdicts</SelectItem>
            {VERDICTS.map((v) => (
              <SelectItem key={v} value={v}>
                {VERDICT_META[v].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={minAge} onValueChange={setMinAge}>
          <SelectTrigger>
            <SelectValue placeholder="Read age" />
          </SelectTrigger>
          <SelectContent>
            {MIN_AGE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={apply}>Apply</Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
          <Button asChild variant="outline">
            <a href={csvHref} download>
              <Download className="mr-2 h-4 w-4" />
              CSV
            </a>
          </Button>
        </div>
      </div>

      {meta?.truncated && (
        <p className="text-xs text-amber-600">
          Result capped at 5000 conversations — narrow the day range.
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Agent</TableHead>
              <TableHead>Last message read</TableHead>
              <TableHead>Read</TableHead>
              <TableHead>Webhook verdict</TableHead>
              <TableHead>Chat</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  Nobody matches these filters.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.conversationId}>
                  <TableCell>
                    <div className="text-sm font-medium">{row.name || "—"}</div>
                    <div className="font-mono text-xs text-muted-foreground">
                      +{row.phone}
                    </div>
                    {row.location && (
                      <div className="text-[11px] text-muted-foreground">
                        {row.location}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    {row.assignedAgentName ?? "—"}
                  </TableCell>
                  <TableCell className="max-w-[260px] text-xs">
                    {row.lastReadMessage.templateName ? (
                      <Badge variant="outline" className="mb-1">
                        {row.lastReadMessage.templateName}
                      </Badge>
                    ) : null}
                    <div className="line-clamp-2">
                      {row.lastReadMessage.preview ?? row.lastReadMessage.type}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      sent {formatDateTime(row.lastReadMessage.sentAt)}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    {timeAgo(row.lastReadMessage.readAt)}
                    <div className="text-[10px] text-muted-foreground">
                      {formatDateTime(row.lastReadMessage.readAt)}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[300px]">
                    <Badge
                      className={VERDICT_META[row.verdict].className}
                      title={VERDICT_META[row.verdict].help}
                    >
                      {VERDICT_META[row.verdict].label}
                    </Badge>
                    <RowDetails row={row} />
                  </TableCell>
                  <TableCell>
                    <Button asChild size="sm" variant="outline">
                      <Link
                        href={`/whatsapp?conversation=${row.conversationId}`}
                        target="_blank"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {meta && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{meta.total} customers</span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span>
              Page {page} / {meta.totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= meta.totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
