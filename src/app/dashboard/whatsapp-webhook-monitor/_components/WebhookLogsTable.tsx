"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  WebhookLogListResult,
  WebhookLogListRow,
} from "@/lib/whatsapp/webhookLog/monitorService";
import { apiErrorMessage, formatDateTime } from "../_lib/format";

type Props = {
  /** Locks the kind filter (e.g. inbound messages tab). */
  lockedKind?: "inbound_message";
  days: number;
};

const PROCESSING_OPTIONS = [
  "pending",
  "saved",
  "duplicate",
  "dropped",
  "error",
] as const;
const KIND_OPTIONS = [
  "status",
  "inbound_message",
  "message_echo",
  "call",
  "history",
  "app_state_sync",
  "other",
] as const;

function processingBadge(row: WebhookLogListRow) {
  if (row.kind !== "inbound_message") return <span className="text-muted-foreground">—</span>;
  if (row.signatureStatus === "invalid") {
    return <Badge variant="destructive">rejected: bad signature</Badge>;
  }
  if (row.stalePending) {
    return <Badge variant="destructive">never finished</Badge>;
  }
  switch (row.processingStatus) {
    case "saved":
      return row.processingReason?.startsWith("saved_no_notification") ? (
        <Badge className="bg-amber-500 text-white hover:bg-amber-500">
          saved, not notified
        </Badge>
      ) : (
        <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">saved</Badge>
      );
    case "duplicate":
      return <Badge variant="secondary">duplicate (retry)</Badge>;
    case "dropped":
      return <Badge variant="destructive">dropped</Badge>;
    case "error":
      return <Badge variant="destructive">error</Badge>;
    case "pending":
      return <Badge variant="outline">processing…</Badge>;
    default:
      return <Badge variant="outline">no outcome</Badge>;
  }
}

export function WebhookLogsTable({ lockedKind, days }: Props) {
  const [rows, setRows] = useState<WebhookLogListRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [phone, setPhone] = useState("");
  const [kind, setKind] = useState<string>("all");
  const [processing, setProcessing] = useState<string>("all");
  const [applied, setApplied] = useState({ phone: "", kind: "all", processing: "all" });

  const [payloadRow, setPayloadRow] = useState<WebhookLogListRow | null>(null);

  const effectiveKind = lockedKind ?? (applied.kind === "all" ? undefined : applied.kind);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = { days, page, limit: 50 };
      if (effectiveKind) params.kind = effectiveKind;
      if (applied.processing !== "all") params.processingStatus = applied.processing;
      if (applied.phone.trim()) params.phone = applied.phone.trim();
      const { data } = await axios.get<WebhookLogListResult>(
        "/api/admin/whatsapp-webhook-monitor/logs",
        { params },
      );
      setRows(data.rows);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch (err) {
      setError(apiErrorMessage(err, "Failed to load webhook logs"));
    } finally {
      setLoading(false);
    }
  }, [days, page, effectiveKind, applied]);

  useEffect(() => {
    void load();
  }, [load]);

  const apply = () => {
    setPage(1);
    setApplied({ phone, kind, processing });
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-2 md:grid-cols-5">
        <Input
          placeholder="Customer phone (e.g. 98765…)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && apply()}
        />
        {!lockedKind && (
          <Select value={kind} onValueChange={setKind}>
            <SelectTrigger>
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {KIND_OPTIONS.map((k) => (
                <SelectItem key={k} value={k}>
                  {k.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={processing} onValueChange={setProcessing}>
          <SelectTrigger>
            <SelectValue placeholder="Outcome" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any outcome</SelectItem>
            {PROCESSING_OPTIONS.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={apply}>Apply</Button>
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span className="ml-2">Refresh</span>
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Received</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Content / status</TableHead>
              <TableHead>Outcome</TableHead>
              <TableHead>Notified</TableHead>
              <TableHead>Payload</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  No webhooks match these filters in the last {days} days.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap text-xs">
                    {formatDateTime(row.receivedAt)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{row.kind.replace(/_/g, " ")}</Badge>
                    {row.messageType && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        {row.messageType}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {row.customerPhone ?? "—"}
                  </TableCell>
                  <TableCell className="max-w-[260px] text-xs">
                    {row.preview ?? row.status ?? "—"}
                    {row.messageId && (
                      <span
                        className="block truncate font-mono text-[10px] text-muted-foreground"
                        title={row.messageId}
                      >
                        {row.messageId}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[240px]">
                    {processingBadge(row)}
                    {(row.processingReason || row.processingError) && (
                      <span className="mt-1 block break-all text-[10px] text-muted-foreground">
                        {row.processingReason}
                        {row.processingError ? ` — ${row.processingError}` : ""}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs tabular-nums">
                    {row.kind === "inbound_message" &&
                    row.socketEmittedCount !== undefined
                      ? `${row.socketEmittedCount}/${row.eligibleUserCount ?? 0}`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPayloadRow(row)}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{total} rows</span>
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
            Page {page} / {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      <Dialog open={payloadRow !== null} onOpenChange={(o) => !o && setPayloadRow(null)}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Raw Meta payload</DialogTitle>
          </DialogHeader>
          <pre className="overflow-x-auto rounded bg-muted p-3 text-xs">
            {JSON.stringify(payloadRow?.payload ?? null, null, 2)}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}
