"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "@/util/axios";
import Heading from "@/components/Heading";
import HandLoader from "@/components/HandLoader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";
import MapPaymentModal from "../_components/map-payment-modal";
import {
  formatDateTime,
  formatMoney,
  transactionPublicId,
  type FinanceTransaction,
} from "../_lib/types";
import { ChevronDown, ChevronUp, ExternalLink, MapPin, Filter, X } from "lucide-react";

const STATUS_OPTIONS = [
  "all",
  "created",
  "authorized",
  "captured",
  "paid",
  "partially_paid",
  "failed",
  "cancelled",
  "expired",
  "refunded",
] as const;

const STATUS_COLORS: Record<string, string> = {
  captured: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  paid: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  authorized: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  refunded: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  cancelled: "bg-gray-100 text-gray-600 dark:bg-gray-800/40 dark:text-gray-400",
  expired: "bg-gray-100 text-gray-600 dark:bg-gray-800/40 dark:text-gray-400",
  created: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  partially_paid: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
};

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide leading-tight whitespace-nowrap ${STATUS_COLORS[status] ?? "bg-muted text-muted-foreground"}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

function MappedPill({ mapped }: { mapped: boolean }) {
  return mapped ? (
    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
      YES
    </span>
  ) : (
    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
      NO
    </span>
  );
}

const TH_BASE =
  "sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 border-b border-r border-slate-300 dark:border-slate-600 whitespace-nowrap select-none";
const TD_BASE =
  "px-2 py-1 text-[12px] border-b border-r border-slate-200 dark:border-slate-700 whitespace-nowrap";
const ROW_EVEN = "bg-white dark:bg-slate-900";
const ROW_ODD = "bg-slate-50/70 dark:bg-slate-900/50";
const ROW_HOVER = "hover:bg-blue-50/60 dark:hover:bg-blue-950/30";

export default function FinanceTransactionsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<FinanceTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [mapOpen, setMapOpen] = useState(false);
  const [selected, setSelected] = useState<FinanceTransaction | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const page = Number.parseInt(searchParams?.get("page") ?? "1", 10) || 1;
  const [search, setSearch] = useState(searchParams?.get("search") ?? "");
  const [status, setStatus] = useState(searchParams?.get("status") ?? "all");
  const [mapped, setMapped] = useState(searchParams?.get("mapped") ?? "all");
  const [method, setMethod] = useState(searchParams?.get("method") ?? "");
  const [dateFrom, setDateFrom] = useState(searchParams?.get("dateFrom") ?? "");
  const [dateTo, setDateTo] = useState(searchParams?.get("dateTo") ?? "");

  const activeFilterCount = [
    status !== "all",
    mapped !== "all",
    !!method,
    !!dateFrom,
    !!dateTo,
  ].filter(Boolean).length;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 50 };
      if (search) params.search = search;
      if (status !== "all") params.status = status;
      if (mapped !== "all") params.mapped = mapped;
      if (method) params.method = method;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      const { data } = await axios.get("/api/finance/transactions", { params });
      if (data.success) {
        setRows(data.data ?? []);
        setTotalPages(data.totalPages ?? 1);
        setTotal(data.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [page, search, status, mapped, method, dateFrom, dateTo]);

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

  const handlePageChange = (newPage: number) => pushParams({ page: String(newPage) });

  const applyFilters = () => {
    pushParams({ page: "1", search, status, mapped, method, dateFrom, dateTo });
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setMapped("all");
    setMethod("");
    setDateFrom("");
    setDateTo("");
    pushParams({ page: "1", search: "", status: "", mapped: "", method: "", dateFrom: "", dateTo: "" });
  };

  const renderPagination = () => {
    const items = [];
    const maxVisible = 7;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
    if (start > 1) {
      items.push(
        <PaginationItem key="s-el"><PaginationEllipsis /></PaginationItem>,
      );
    }
    for (let i = start; i <= end; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink
            href="#"
            isActive={page === i}
            onClick={(e) => { e.preventDefault(); handlePageChange(i); }}
          >
            {i}
          </PaginationLink>
        </PaginationItem>,
      );
    }
    if (end < totalPages) {
      items.push(
        <PaginationItem key="e-el"><PaginationEllipsis /></PaginationItem>,
      );
    }
    return items;
  };

  const rowIdx = (page - 1) * 50;

  return (
    <div className="flex flex-col h-full">
      {/* ─── Toolbar ─── */}
      <div className="flex-none px-3 pt-3 pb-2 space-y-2 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Heading
            heading="Finance Transactions"
            subheading={`${total.toLocaleString()} records`}
          />
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/finance">Overview</Link>
            </Button>
          </div>
        </div>

        {/* Search bar + filter toggle */}
        <div className="flex gap-2 items-center">
          <div className="relative flex-1 max-w-md">
            <Input
              placeholder="Search phone, name, email, payment ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") applyFilters(); }}
              className="h-8 text-xs pr-8"
            />
            {search && (
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => { setSearch(""); pushParams({ page: "1", search: "" }); }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Button
            variant={filtersOpen ? "secondary" : "outline"}
            size="sm"
            className="gap-1.5 h-8 text-xs"
            onClick={() => setFiltersOpen(!filtersOpen)}
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] h-4 w-4">
                {activeFilterCount}
              </span>
            )}
            {filtersOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
          <Button size="sm" className="h-8 text-xs" onClick={applyFilters}>
            Go
          </Button>
        </div>

        {/* Collapsible filter row */}
        {filtersOpen && (
          <div className="flex flex-wrap gap-2 items-end pt-1">
            <div className="space-y-0.5">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-7 text-xs w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s === "all" ? "All" : s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-0.5">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Mapped</label>
              <Select value={mapped} onValueChange={setMapped}>
                <SelectTrigger className="h-7 text-xs w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="false">Unmapped</SelectItem>
                  <SelectItem value="true">Mapped</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-0.5">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Method</label>
              <Input placeholder="upi, card…" value={method} onChange={(e) => setMethod(e.target.value)} className="h-7 text-xs w-[100px]" />
            </div>
            <div className="space-y-0.5">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">From</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-7 text-xs w-[130px]" />
            </div>
            <div className="space-y-0.5">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">To</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-7 text-xs w-[130px]" />
            </div>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={clearFilters}>
                Clear all
              </Button>
            )}
          </div>
        )}
      </div>

      {/* ─── Spreadsheet ─── */}
      {loading ? (
        <div className="flex justify-center py-16"><HandLoader /></div>
      ) : (
        <div className="flex-1 overflow-auto border-l border-slate-200 dark:border-slate-700">
          <table className="w-full border-collapse min-w-[1200px]">
            <thead>
              <tr>
                <th className={`${TH_BASE} w-10 text-center border-l-0`}>#</th>
                <th className={`${TH_BASE} w-[72px]`}>Status</th>
                <th className={`${TH_BASE} w-[140px]`}>Customer</th>
                <th className={`${TH_BASE} w-[120px]`}>Phone</th>
                <th className={`${TH_BASE} w-[110px] text-right`}>Amount</th>
                <th className={`${TH_BASE} w-[70px]`}>Method</th>
                <th className={`${TH_BASE} w-[180px]`}>Payment ID</th>
                <th className={`${TH_BASE} w-[180px]`}>Link ID</th>
                <th className={`${TH_BASE} w-[140px]`}>Paid At</th>
                <th className={`${TH_BASE} w-[55px] text-center`}>Mapped</th>
                <th className={`${TH_BASE} w-[120px]`}>Booking</th>
                <th className={`${TH_BASE} w-[52px] text-center`}>Invoice</th>
                <th className={`${TH_BASE} w-[80px] text-center border-r-0`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={13} className="text-center py-12 text-sm text-muted-foreground">
                    No transactions found
                  </td>
                </tr>
              ) : (
                rows.map((row, i) => {
                  const pub = transactionPublicId(row);
                  const bgClass = i % 2 === 0 ? ROW_EVEN : ROW_ODD;
                  return (
                    <tr
                      key={`${row.paymentId ?? ""}-${row.paymentLinkId ?? ""}-${row.createdAt}`}
                      className={`${bgClass} ${ROW_HOVER} transition-colors group`}
                    >
                      <td className={`${TD_BASE} text-center text-[10px] text-muted-foreground tabular-nums border-l-0`}>
                        {rowIdx + i + 1}
                      </td>
                      <td className={TD_BASE}>
                        <StatusPill status={row.status} />
                      </td>
                      <td className={`${TD_BASE} font-medium truncate max-w-[140px]`} title={row.customerName ?? undefined}>
                        {row.customerName || "—"}
                      </td>
                      <td className={`${TD_BASE} tabular-nums`}>
                        {row.customerPhone || "—"}
                      </td>
                      <td className={`${TD_BASE} text-right font-semibold tabular-nums`}>
                        {formatMoney(row.amount, row.currency)}
                      </td>
                      <td className={`${TD_BASE} uppercase text-[10px]`}>
                        {row.method || "—"}
                      </td>
                      <td className={`${TD_BASE} font-mono text-[10px] text-muted-foreground truncate max-w-[180px]`} title={row.paymentId ?? undefined}>
                        {row.paymentId || "—"}
                      </td>
                      <td className={`${TD_BASE} font-mono text-[10px] text-muted-foreground truncate max-w-[180px]`} title={row.paymentLinkId ?? undefined}>
                        {row.paymentLinkId || "—"}
                      </td>
                      <td className={`${TD_BASE} text-[11px] tabular-nums`}>
                        {formatDateTime(row.paidAt)}
                      </td>
                      <td className={`${TD_BASE} text-center`}>
                        <MappedPill mapped={row.mapped} />
                      </td>
                      <td className={`${TD_BASE} text-[11px]`}>
                        {row.bookingId || "—"}
                      </td>
                      <td className={`${TD_BASE} text-center text-[11px]`}>
                        {row.invoiceStatus === "generated" || row.invoiceStatus === "sent" ? (
                          <span className="text-green-600 dark:text-green-400 font-semibold text-[10px]">
                            {row.invoiceStatus === "sent" ? "SENT" : "GEN"}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-[10px]">—</span>
                        )}
                      </td>
                      <td className={`${TD_BASE} text-center border-r-0`}>
                        <div className="flex items-center justify-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          {pub && (
                            <Link
                              href={`/dashboard/finance/transactions/${pub.id}?type=${pub.type}`}
                              className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-muted-foreground hover:text-foreground"
                              title="View details"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          )}
                          {!row.mapped && (
                            <button
                              type="button"
                              onClick={() => { setSelected(row); setMapOpen(true); }}
                              className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400"
                              title="Map payment"
                            >
                              <MapPin className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Footer ─── */}
      {totalPages > 1 && (
        <div className="flex-none px-3 py-2 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground tabular-nums">
            Page {page} of {totalPages} · {total.toLocaleString()} records
          </span>
          <Pagination>
            <PaginationContent>{renderPagination()}</PaginationContent>
          </Pagination>
        </div>
      )}

      <MapPaymentModal
        open={mapOpen}
        onOpenChange={setMapOpen}
        transaction={selected}
        onMapped={() => void load()}
      />
    </div>
  );
}
