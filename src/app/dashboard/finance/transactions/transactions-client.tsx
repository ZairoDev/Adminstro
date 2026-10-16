"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "@/util/axios";
import Heading from "@/components/Heading";
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
  FinanceSheetEmpty,
  FinanceSheetError,
  FinanceSheetSkeleton,
  sheetFooterClass,
  sheetFrameClass,
  sheetRowClass,
  sheetScrollClass,
  sheetTableClass,
  sheetTdClass,
  sheetThClass,
  sheetToolbarClass,
} from "../_components/finance-sheet-frame";
import {
  formatDateTime,
  formatMoney,
  transactionPublicId,
  type FinanceTransaction,
} from "../_lib/types";
import { ExternalLink } from "lucide-react";

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
  captured: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  paid: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  authorized: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  failed: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  refunded: "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200",
  cancelled: "bg-muted text-muted-foreground",
  expired: "bg-muted text-muted-foreground",
  created: "bg-yellow-100 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-200",
  partially_paid: "bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-100",
};

function statusLabel(status: string): string {
  return status.replaceAll("_", " ");
}

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${STATUS_COLORS[status] ?? "bg-muted text-muted-foreground"}`}
    >
      {statusLabel(status)}
    </span>
  );
}

function invoiceLabel(status: FinanceTransaction["invoiceStatus"]): string {
  if (status === "sent") return "Sent";
  if (status === "generated") return "Generated";
  if (status === "failed") return "Failed";
  return "Not generated";
}

export default function FinanceTransactionsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<FinanceTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [mapOpen, setMapOpen] = useState(false);
  const [selected, setSelected] = useState<FinanceTransaction | null>(null);

  const queryKey = searchParams?.toString() ?? "";
  const page = Number.parseInt(searchParams?.get("page") ?? "1", 10) || 1;
  const [search, setSearch] = useState(searchParams?.get("search") ?? "");
  const [status, setStatus] = useState(searchParams?.get("status") ?? "all");
  const [mapped, setMapped] = useState(searchParams?.get("mapped") ?? "all");
  const [method, setMethod] = useState(searchParams?.get("method") ?? "");
  const [dateFrom, setDateFrom] = useState(searchParams?.get("dateFrom") ?? "");
  const [dateTo, setDateTo] = useState(searchParams?.get("dateTo") ?? "");

  const filtersActive = Boolean(
    searchParams?.get("search") ||
      searchParams?.get("status") ||
      searchParams?.get("mapped") ||
      searchParams?.get("method") ||
      searchParams?.get("dateFrom") ||
      searchParams?.get("dateTo"),
  );

  useEffect(() => {
    const current = new URLSearchParams(queryKey);
    setSearch(current.get("search") ?? "");
    setStatus(current.get("status") ?? "all");
    setMapped(current.get("mapped") ?? "all");
    setMethod(current.get("method") ?? "");
    setDateFrom(current.get("dateFrom") ?? "");
    setDateTo(current.get("dateTo") ?? "");
  }, [queryKey]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const current = new URLSearchParams(queryKey);
      const params: Record<string, string | number> = {
        page: Number.parseInt(current.get("page") ?? "1", 10) || 1,
        limit: 50,
      };
      const appliedSearch = current.get("search") ?? "";
      const appliedStatus = current.get("status") ?? "all";
      const appliedMapped = current.get("mapped") ?? "all";
      const appliedMethod = current.get("method") ?? "";
      const appliedFrom = current.get("dateFrom") ?? "";
      const appliedTo = current.get("dateTo") ?? "";
      if (appliedSearch) params.search = appliedSearch;
      if (appliedStatus !== "all") params.status = appliedStatus;
      if (appliedMapped !== "all") params.mapped = appliedMapped;
      if (appliedMethod) params.method = appliedMethod;
      if (appliedFrom) params.dateFrom = appliedFrom;
      if (appliedTo) params.dateTo = appliedTo;

      const { data } = await axios.get("/api/finance/transactions", { params });
      if (data.success) {
        setRows(data.data ?? []);
        setTotalPages(data.totalPages ?? 1);
        setTotal(data.total ?? 0);
      } else {
        setError("The transactions request did not succeed. Try again.");
      }
    } catch {
      setError("The transactions could not be loaded. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [queryKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const pushParams = (next: Record<string, string>) => {
    const params = new URLSearchParams(searchParams ?? undefined);
    Object.entries(next).forEach(([key, value]) => {
      if (!value || value === "all") params.delete(key);
      else params.set(key, value);
    });
    const query = params.toString();
    router.push(query ? `?${query}` : "?");
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
    pushParams({
      page: "1",
      search: "",
      status: "",
      mapped: "",
      method: "",
      dateFrom: "",
      dateTo: "",
    });
  };

  const renderPagination = () => {
    const items = [];
    const maxVisible = 7;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
    if (start > 1) {
      items.push(
        <PaginationItem key="s-el">
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
            onClick={(event) => {
              event.preventDefault();
              handlePageChange(i);
            }}
          >
            {i}
          </PaginationLink>
        </PaginationItem>,
      );
    }
    if (end < totalPages) {
      items.push(
        <PaginationItem key="e-el">
          <PaginationEllipsis />
        </PaginationItem>,
      );
    }
    return items;
  };

  const rowIdx = (page - 1) * 50;

  return (
    <div className={sheetFrameClass}>
      <div className={sheetToolbarClass}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <Heading
            heading="Finance Transactions"
            subheading={`${total.toLocaleString()} payments from Razorpay`}
          />
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" className="cursor-pointer">
              <Link href="/dashboard/finance/sales-sheet">Sales sheet</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="cursor-pointer">
              <Link href="/dashboard/finance">Overview</Link>
            </Button>
          </div>
        </div>

        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            applyFilters();
          }}
        >
          <div className="w-full min-w-[16rem] flex-1 space-y-1.5 sm:max-w-md">
            <label htmlFor="tx-search" className="text-xs font-medium text-foreground">
              Search
            </label>
            <Input
              id="tx-search"
              placeholder="Phone, name, email, or payment ID"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-10 text-base"
            />
          </div>
          <div className="w-full space-y-1.5 sm:w-40">
            <label htmlFor="tx-status" className="text-xs font-medium text-foreground">
              Status
            </label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="tx-status" className="h-10 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option === "all" ? "All statuses" : statusLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full space-y-1.5 sm:w-36">
            <label htmlFor="tx-mapped" className="text-xs font-medium text-foreground">
              Mapping
            </label>
            <Select value={mapped} onValueChange={setMapped}>
              <SelectTrigger id="tx-mapped" className="h-10 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="false">Unmapped</SelectItem>
                <SelectItem value="true">Mapped</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full space-y-1.5 sm:w-36">
            <label htmlFor="tx-method" className="text-xs font-medium text-foreground">
              Method
            </label>
            <Input
              id="tx-method"
              placeholder="upi, card"
              value={method}
              onChange={(event) => setMethod(event.target.value)}
              className="h-10 text-base"
            />
          </div>
          <div className="w-full space-y-1.5 sm:w-40">
            <label htmlFor="tx-from" className="text-xs font-medium text-foreground">
              Paid from
            </label>
            <Input
              id="tx-from"
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="h-10 text-base"
            />
          </div>
          <div className="w-full space-y-1.5 sm:w-40">
            <label htmlFor="tx-to" className="text-xs font-medium text-foreground">
              Paid to
            </label>
            <Input
              id="tx-to"
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="h-10 text-base"
            />
          </div>
          <div className="flex items-end gap-2">
            <Button type="submit" size="sm" className="h-10 cursor-pointer">
              Apply filters
            </Button>
            {filtersActive && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-10 cursor-pointer"
                onClick={clearFilters}
              >
                Clear filters
              </Button>
            )}
          </div>
        </form>
        <p className="text-xs text-muted-foreground lg:hidden">
          Scroll sideways to see payment IDs and actions.
        </p>
      </div>

      {loading ? (
        <FinanceSheetSkeleton />
      ) : error ? (
        <FinanceSheetError message={error} onRetry={() => void load()} />
      ) : rows.length === 0 ? (
        <FinanceSheetEmpty
          title={filtersActive ? "No transactions match these filters" : "No transactions yet"}
          description={
            filtersActive
              ? "Clear the filters or search for a different name, phone, or payment ID."
              : "Razorpay payments will appear here. Map a paid one to add it to the sales sheet."
          }
        >
          {filtersActive ? (
            <Button type="button" variant="outline" className="cursor-pointer" onClick={clearFilters}>
              Clear filters
            </Button>
          ) : (
            <Button asChild variant="outline" className="cursor-pointer">
              <Link href="/dashboard/finance/sales-sheet">Open sales sheet</Link>
            </Button>
          )}
        </FinanceSheetEmpty>
      ) : (
        <div className={sheetScrollClass}>
          <table className={`${sheetTableClass} min-w-[1180px]`}>
            <caption className="sr-only">
              Finance transactions, page {page} of {totalPages}
            </caption>
            <thead>
              <tr>
                <th scope="col" className={`${sheetThClass} w-14 text-center`}>#</th>
                <th scope="col" className={sheetThClass}>Status</th>
                <th scope="col" className={sheetThClass}>Customer</th>
                <th scope="col" className={sheetThClass}>Phone</th>
                <th scope="col" className={`${sheetThClass} text-right`}>Amount</th>
                <th scope="col" className={sheetThClass}>Method</th>
                <th scope="col" className={sheetThClass}>Payment ID</th>
                <th scope="col" className={sheetThClass}>Link ID</th>
                <th scope="col" className={sheetThClass}>Paid at</th>
                <th scope="col" className={sheetThClass}>Mapping</th>
                <th scope="col" className={sheetThClass}>Booking</th>
                <th scope="col" className={sheetThClass}>Invoice</th>
                <th scope="col" className={sheetThClass}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const pub = transactionPublicId(row);
                return (
                  <tr
                    key={`${row.paymentId ?? ""}-${row.paymentLinkId ?? ""}-${row.createdAt}`}
                    className={sheetRowClass(
                      index,
                      row.mapped ? undefined : "bg-amber-50/70 dark:bg-amber-950/25",
                    )}
                  >
                    <td className={`${sheetTdClass} text-center tabular-nums text-muted-foreground`}>
                      {rowIdx + index + 1}
                    </td>
                    <td className={sheetTdClass}>
                      <StatusPill status={row.status} />
                    </td>
                    <td className={`${sheetTdClass} max-w-[180px] truncate font-medium`} title={row.customerName ?? undefined}>
                      {row.customerName || "—"}
                    </td>
                    <td className={`${sheetTdClass} tabular-nums`}>{row.customerPhone || "—"}</td>
                    <td className={`${sheetTdClass} text-right font-semibold tabular-nums`}>
                      {formatMoney(row.amount, row.currency)}
                    </td>
                    <td className={`${sheetTdClass} capitalize`}>{row.method || "—"}</td>
                    <td className={`${sheetTdClass} max-w-[200px] truncate font-mono text-xs`} title={row.paymentId ?? undefined}>
                      {row.paymentId || "—"}
                    </td>
                    <td className={`${sheetTdClass} max-w-[200px] truncate font-mono text-xs`} title={row.paymentLinkId ?? undefined}>
                      {row.paymentLinkId || "—"}
                    </td>
                    <td className={`${sheetTdClass} tabular-nums`}>{formatDateTime(row.paidAt)}</td>
                    <td className={sheetTdClass}>
                      {row.mapped ? (
                        <span className="text-xs font-semibold text-green-800 dark:text-green-200">Mapped</span>
                      ) : (
                        <span className="text-xs font-semibold text-amber-900 dark:text-amber-100">Unmapped</span>
                      )}
                    </td>
                    <td className={sheetTdClass}>{row.bookingId || "—"}</td>
                    <td className={sheetTdClass}>{invoiceLabel(row.invoiceStatus)}</td>
                    <td className={sheetTdClass}>
                      <div className="flex items-center gap-2">
                        {pub && (
                          <Button asChild variant="outline" size="sm" className="h-9 cursor-pointer">
                            <Link
                              href={`/dashboard/finance/transactions/${pub.id}?type=${pub.type}`}
                              aria-label={`View transaction ${row.paymentId ?? row.paymentLinkId ?? ""}`}
                            >
                              <ExternalLink className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                              View
                            </Link>
                          </Button>
                        )}
                        {!row.mapped && (
                          <Button
                            type="button"
                            size="sm"
                            className="h-9 cursor-pointer"
                            onClick={() => {
                              setSelected(row);
                              setMapOpen(true);
                            }}
                          >
                            Map
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && (
        <div className={sheetFooterClass}>
          <p className="text-sm tabular-nums text-muted-foreground">
            Page {page} of {totalPages} · {total.toLocaleString()} records
          </p>
          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>{renderPagination()}</PaginationContent>
            </Pagination>
          )}
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
