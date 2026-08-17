"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "@/util/axios";
import Heading from "@/components/Heading";
import HandLoader from "@/components/HandLoader";
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
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";
import { formatDateTime, type WebhookLogRow } from "../_lib/types";

export default function WebhookLogsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = Number.parseInt(searchParams?.get("page") ?? "1", 10) || 1;

  const [rows, setRows] = useState<WebhookLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState(searchParams?.get("search") ?? "");
  const [status, setStatus] = useState(searchParams?.get("status") ?? "all");
  const [processed, setProcessed] = useState(
    searchParams?.get("processed") ?? "all",
  );
  const [payloadOpen, setPayloadOpen] = useState(false);
  const [payload, setPayload] = useState<unknown>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 25 };
      if (search) params.search = search;
      if (status !== "all") params.status = status;
      if (processed !== "all") params.processed = processed;
      const { data } = await axios.get("/api/finance/webhook-logs", { params });
      if (data.success) {
        setRows(data.data ?? []);
        setTotalPages(data.totalPages ?? 1);
      }
    } finally {
      setLoading(false);
    }
  }, [page, search, status, processed]);

  useEffect(() => {
    void load();
  }, [load]);

  const pushParams = (next: Record<string, string>) => {
    const params = new URLSearchParams(searchParams ?? undefined);
    Object.entries(next).forEach(([k, v]) => {
      if (!v || v === "all") params.delete(k);
      else params.set(k, v);
    });
    router.push(`?${params.toString()}`);
  };

  const renderPagination = () => {
    const items = [];
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    if (start > 1) {
      items.push(
        <PaginationItem key="se">
          <PaginationEllipsis />
        </PaginationItem>,
      );
    }
    for (let i = start; i <= end; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink
            href="#"
            isActive={page === i}
            onClick={(e) => {
              e.preventDefault();
              pushParams({ page: String(i) });
            }}
          >
            {i}
          </PaginationLink>
        </PaginationItem>,
      );
    }
    if (end < totalPages) {
      items.push(
        <PaginationItem key="ee">
          <PaginationEllipsis />
        </PaginationItem>,
      );
    }
    return items;
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Heading
          heading="Webhook Logs"
          subheading="Raw Razorpay webhook deliveries for debugging"
        />
        <Button asChild variant="outline">
          <Link href="/dashboard/finance">Overview</Link>
        </Button>
      </div>

      <div className="grid gap-2 md:grid-cols-4">
        <Input
          placeholder="Search event / payment ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              pushParams({ page: "1", search, status, processed });
            }
          }}
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="received">received</SelectItem>
            <SelectItem value="processed">processed</SelectItem>
            <SelectItem value="ignored">ignored</SelectItem>
            <SelectItem value="invalid_signature">invalid_signature</SelectItem>
            <SelectItem value="error">error</SelectItem>
          </SelectContent>
        </Select>
        <Select value={processed} onValueChange={setProcessed}>
          <SelectTrigger>
            <SelectValue placeholder="Processed" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="true">Processed</SelectItem>
            <SelectItem value="false">Unprocessed</SelectItem>
          </SelectContent>
        </Select>
        <Button
          onClick={() => pushParams({ page: "1", search, status, processed })}
        >
          Apply
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <HandLoader />
        </div>
      ) : (
        <>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Received</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Retry</TableHead>
                  <TableHead>Signature</TableHead>
                  <TableHead>Payload</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      No webhook logs
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{formatDateTime(row.receivedAt)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{row.event || "—"}</Badge>
                      </TableCell>
                      <TableCell>{row.status}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs">
                        {row.error || (row.processed ? "OK" : "—")}
                      </TableCell>
                      <TableCell>{row.retryCount}</TableCell>
                      <TableCell>
                        {row.signatureVerified ? "Verified" : "No"}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setPayload(row.payload);
                            setPayloadOpen(true);
                          }}
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
          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>{renderPagination()}</PaginationContent>
            </Pagination>
          )}
        </>
      )}

      <Dialog open={payloadOpen} onOpenChange={setPayloadOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Webhook Payload</DialogTitle>
          </DialogHeader>
          <pre className="text-xs overflow-x-auto rounded bg-muted p-3">
            {JSON.stringify(payload, null, 2)}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}
