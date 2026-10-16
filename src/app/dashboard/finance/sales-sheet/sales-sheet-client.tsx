"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "@/util/axios";
import Heading from "@/components/Heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  formatExchangeRate,
  formatInvoiceValueInr,
  invoiceValueInInr,
  type SalesSheetRow,
} from "@/modules/finance/sales-sheet";
import { AlertTriangle, Download } from "lucide-react";
import {
  FinanceSheetEmpty,
  FinanceSheetError,
  FinanceSheetSkeleton,
  SheetStat,
  sheetFooterClass,
  sheetFrameClass,
  sheetRowClass,
  sheetScrollClass,
  sheetTableClass,
  sheetTdClass,
  sheetThClass,
  sheetToolbarClass,
} from "../_components/finance-sheet-frame";

type SalesSheetResponse = {
  success: boolean;
  data?: SalesSheetRow[];
  total?: number;
  totalPages?: number;
  totalInvoiceValueInr?: number;
  missingRateCount?: number;
  truncated?: boolean;
  message?: string;
};

function cell(value: string): string {
  return value.trim() ? value : "—";
}

function RateCell({
  row,
  onSaved,
}: {
  row: SalesSheetRow;
  onSaved: (paymentObjectId: string, exchangeRate: number) => void;
}) {
  const { toast } = useToast();
  const [value, setValue] = useState(
    row.exchangeRate == null ? "" : formatExchangeRate(row.exchangeRate),
  );
  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    setValue(row.exchangeRate == null ? "" : formatExchangeRate(row.exchangeRate));
  }, [row.exchangeRate, row.paymentObjectId, row.invoiceNumber]);

  const save = async () => {
    const trimmed = value.trim();
    if (!trimmed) {
      setFieldError(row.exchangeRate == null ? "Enter a rate to calculate rupees." : null);
      return;
    }
    const next = Number(trimmed);
    if (!Number.isFinite(next) || next <= 0) {
      setFieldError("Use a number greater than zero.");
      setValue(row.exchangeRate == null ? "" : formatExchangeRate(row.exchangeRate));
      return;
    }
    setFieldError(null);
    if (row.exchangeRate != null && next === row.exchangeRate) return;

    setSaving(true);
    try {
      const { data } = await axios.patch<{ success: boolean; message?: string }>(
        "/api/finance/sales-sheet",
        {
          paymentObjectId: row.paymentObjectId,
          paymentId: row.paymentId ?? undefined,
          paymentLinkId: row.paymentLinkId ?? undefined,
          exchangeRate: next,
        },
      );
      if (!data.success) {
        const message = data.message ?? "Could not save the exchange rate.";
        setFieldError(message);
        toast({ title: message, variant: "destructive" });
        return;
      }
      onSaved(row.paymentObjectId, next);
    } catch {
      setFieldError("Could not save. Try again.");
      toast({ title: "Could not save the exchange rate", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const fieldId = `rate-${row.paymentObjectId}-${row.serial}`;

  return (
    <div className="space-y-1">
      <label htmlFor={fieldId} className="sr-only">
        Exchange rate for {row.customerName || "this payment"}
      </label>
      <Input
        id={fieldId}
        value={value}
        inputMode="decimal"
        disabled={saving}
        aria-invalid={fieldError ? true : undefined}
        aria-describedby={fieldError ? `${fieldId}-error` : undefined}
        onChange={(event) => {
          setValue(event.target.value);
          if (fieldError) setFieldError(null);
        }}
        onBlur={() => {
          void save();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
        placeholder={row.currency === "INR" ? "1" : "Rate"}
        className="h-10 w-24 text-right text-base tabular-nums"
      />
      {saving ? <p className="text-xs text-muted-foreground">Saving…</p> : null}
      {fieldError ? (
        <p id={`${fieldId}-error`} className="max-w-[8rem] text-xs leading-4 text-destructive" role="alert">
          {fieldError}
        </p>
      ) : null}
      {!saving && !fieldError && row.exchangeRate == null ? (
        <p className="text-xs font-medium text-amber-900 dark:text-amber-100">Needs a rate</p>
      ) : null}
    </div>
  );
}

export default function SalesSheetClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [rows, setRows] = useState<SalesSheetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalInvoiceValueInr, setTotalInvoiceValueInr] = useState(0);
  const [missingRateCount, setMissingRateCount] = useState(0);
  const [truncated, setTruncated] = useState(false);

  const queryKey = searchParams?.toString() ?? "";
  const page = Number.parseInt(searchParams?.get("page") ?? "1", 10) || 1;
  const [search, setSearch] = useState(searchParams?.get("search") ?? "");
  const [dateFrom, setDateFrom] = useState(searchParams?.get("dateFrom") ?? "");
  const [dateTo, setDateTo] = useState(searchParams?.get("dateTo") ?? "");
  const filtersActive = Boolean(
    searchParams?.get("search") || searchParams?.get("dateFrom") || searchParams?.get("dateTo"),
  );

  useEffect(() => {
    const current = new URLSearchParams(queryKey);
    setSearch(current.get("search") ?? "");
    setDateFrom(current.get("dateFrom") ?? "");
    setDateTo(current.get("dateTo") ?? "");
  }, [queryKey]);

  const load = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const current = new URLSearchParams(queryKey);
      const params: Record<string, string | number> = {
        page: Number.parseInt(current.get("page") ?? "1", 10) || 1,
        limit: 50,
      };
      const appliedSearch = current.get("search") ?? "";
      const appliedFrom = current.get("dateFrom") ?? "";
      const appliedTo = current.get("dateTo") ?? "";
      if (appliedSearch) params.search = appliedSearch;
      if (appliedFrom) params.dateFrom = appliedFrom;
      if (appliedTo) params.dateTo = appliedTo;
      const { data } = await axios.get<SalesSheetResponse>("/api/finance/sales-sheet", { params });
      if (data.success) {
        setRows(data.data ?? []);
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 1);
        setTotalInvoiceValueInr(data.totalInvoiceValueInr ?? 0);
        setMissingRateCount(data.missingRateCount ?? 0);
        setTruncated(Boolean(data.truncated));
      } else if (!silent) {
        setError(data.message ?? "The sales sheet request did not succeed. Try again.");
      }
    } catch {
      if (!silent) {
        setError("The sales sheet could not be loaded. Check your connection and try again.");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [queryKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const pushParams = (next: Record<string, string>) => {
    const params = new URLSearchParams(searchParams ?? undefined);
    Object.entries(next).forEach(([key, value]) => {
      if (!value) params.delete(key);
      else params.set(key, value);
    });
    const query = params.toString();
    router.push(query ? `?${query}` : "?");
  };

  const applyFilters = () => {
    pushParams({ page: "1", search, dateFrom, dateTo });
  };

  const clearFilters = () => {
    setSearch("");
    setDateFrom("");
    setDateTo("");
    pushParams({ page: "1", search: "", dateFrom: "", dateTo: "" });
  };

  const onRateSaved = (paymentObjectId: string, exchangeRate: number) => {
    setRows((current) =>
      current.map((row) => {
        if (row.paymentObjectId !== paymentObjectId) return row;
        const invoiceValueInr = invoiceValueInInr(row.amountPaid, exchangeRate);
        return {
          ...row,
          exchangeRate,
          invoiceValueInr,
          invoiceValueLabel: formatInvoiceValueInr(invoiceValueInr),
        };
      }),
    );
    void load(true);
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const params: Record<string, string> = { format: "csv" };
      const current = new URLSearchParams(queryKey);
      const appliedSearch = current.get("search") ?? "";
      const appliedFrom = current.get("dateFrom") ?? "";
      const appliedTo = current.get("dateTo") ?? "";
      if (appliedSearch) params.search = appliedSearch;
      if (appliedFrom) params.dateFrom = appliedFrom;
      if (appliedTo) params.dateTo = appliedTo;
      const response = await axios.get<Blob>("/api/finance/sales-sheet", {
        params,
        responseType: "blob",
      });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = "sales-sheet.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Could not export the sales sheet", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className={sheetFrameClass}>
      <div className={sheetToolbarClass}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <Heading
            heading="Sales Sheet"
            subheading="Paid transactions after they are mapped to a booking"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              className="h-10 cursor-pointer"
              disabled={exporting || total === 0}
              aria-busy={exporting}
              onClick={() => void exportCsv()}
            >
              <Download className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {exporting ? "Exporting…" : "Export CSV"}
            </Button>
            <Button asChild variant="outline" size="sm" className="h-10 cursor-pointer">
              <Link href="/dashboard/finance/transactions">Transactions</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <SheetStat label="Rows" value={total.toLocaleString()} hint="Paid and mapped" />
          <SheetStat
            label="Invoice value in Rs"
            value={formatInvoiceValueInr(totalInvoiceValueInr) || "₹0.00"}
            hint={missingRateCount > 0 ? "Excludes rows still missing a rate" : "All rows included"}
          />
          <SheetStat
            label="Exchange rates"
            value={missingRateCount === 0 ? "Complete" : `${missingRateCount} missing`}
            hint={missingRateCount === 0 ? "Rupee payments use a rate of 1" : "Type a rate on the highlighted rows"}
            tone={missingRateCount > 0 ? "warning" : "default"}
          />
        </div>

        {truncated && (
          <p
            className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
            role="status"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            Showing the latest 5,000 paid transactions. Narrow the dates to see older rows.
          </p>
        )}

        <form
          className="grid gap-3 md:grid-cols-4"
          onSubmit={(event) => {
            event.preventDefault();
            applyFilters();
          }}
        >
          <div className="space-y-1.5 md:col-span-2">
            <label htmlFor="sheet-search" className="text-xs font-medium text-foreground">
              Search
            </label>
            <Input
              id="sheet-search"
              placeholder="Name, phone, email, invoice, or agent"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-10 text-base"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="sheet-from" className="text-xs font-medium text-foreground">
              From
            </label>
            <Input
              id="sheet-from"
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="h-10 text-base"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="sheet-to" className="text-xs font-medium text-foreground">
              To
            </label>
            <Input
              id="sheet-to"
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="h-10 text-base"
            />
          </div>
          <div className="flex items-end gap-2 md:col-span-4">
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
          Scroll sideways to see amount, rate, and agent.
        </p>
      </div>

      {loading ? (
        <FinanceSheetSkeleton />
      ) : error ? (
        <FinanceSheetError message={error} onRetry={() => void load()} />
      ) : rows.length === 0 ? (
        <FinanceSheetEmpty
          title={filtersActive ? "No sales match these filters" : "No paid sales on this sheet yet"}
          description={
            filtersActive
              ? "Clear the filters or search for a different customer, invoice, or agent."
              : "Map a paid transaction and it will show up here with the customer, property, country, and agent."
          }
        >
          {filtersActive ? (
            <Button type="button" variant="outline" className="cursor-pointer" onClick={clearFilters}>
              Clear filters
            </Button>
          ) : (
            <Button asChild className="cursor-pointer">
              <Link href="/dashboard/finance/transactions">Go to transactions</Link>
            </Button>
          )}
        </FinanceSheetEmpty>
      ) : (
        <div className={sheetScrollClass}>
          <table className={`${sheetTableClass} min-w-[1480px]`}>
            <caption className="sr-only">
              Sales sheet, page {page} of {totalPages}
            </caption>
            <thead>
              <tr>
                <th scope="col" className={`${sheetThClass} text-center`}>S No</th>
                <th scope="col" className={sheetThClass}>
                  Date
                  <span className="mt-0.5 block text-xs font-normal normal-case tracking-normal">
                    MM/DD/YYYY
                  </span>
                </th>
                <th scope="col" className={sheetThClass}>Customer name</th>
                <th scope="col" className={sheetThClass}>Contact number</th>
                <th scope="col" className={sheetThClass}>Email</th>
                <th scope="col" className={sheetThClass}>Property address</th>
                <th scope="col" className={sheetThClass}>Country</th>
                <th scope="col" className={sheetThClass}>Invoice number</th>
                <th scope="col" className={`${sheetThClass} text-right`}>Amount paid</th>
                <th scope="col" className={sheetThClass}>Mode</th>
                <th scope="col" className={`${sheetThClass} text-right`}>
                  Exch rate
                  <span className="mt-0.5 block text-xs font-normal normal-case tracking-normal">
                    Saves when you leave the field
                  </span>
                </th>
                <th scope="col" className={`${sheetThClass} text-right`}>Invoice value in Rs</th>
                <th scope="col" className={sheetThClass}>Agent</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const needsRate = row.exchangeRate == null;
                return (
                  <tr
                    key={`${row.paymentObjectId}-${row.invoiceNumber}-${row.serial}`}
                    className={sheetRowClass(
                      index,
                      needsRate ? "bg-amber-50/80 dark:bg-amber-950/30" : undefined,
                    )}
                  >
                    <td className={`${sheetTdClass} text-center tabular-nums`}>{row.serial}</td>
                    <td className={`${sheetTdClass} tabular-nums`}>{cell(row.date)}</td>
                    <td className={`${sheetTdClass} max-w-[160px] truncate font-medium`} title={row.customerName}>
                      {cell(row.customerName)}
                    </td>
                    <td className={`${sheetTdClass} tabular-nums`}>{cell(row.contactNumber)}</td>
                    <td className={`${sheetTdClass} max-w-[200px] truncate`} title={row.email}>
                      {cell(row.email)}
                    </td>
                    <td className={`${sheetTdClass} max-w-[200px] truncate`} title={row.propertyAddress}>
                      {cell(row.propertyAddress)}
                    </td>
                    <td className={sheetTdClass}>{cell(row.country)}</td>
                    <td className={`${sheetTdClass} font-mono text-xs`}>{cell(row.invoiceNumber)}</td>
                    <td className={`${sheetTdClass} text-right font-semibold tabular-nums`}>
                      {row.amountPaidLabel}
                    </td>
                    <td className={sheetTdClass}>{cell(row.mode)}</td>
                    <td className={`${sheetTdClass} text-right`}>
                      <RateCell row={row} onSaved={onRateSaved} />
                    </td>
                    <td className={`${sheetTdClass} text-right font-semibold tabular-nums`}>
                      {cell(row.invoiceValueLabel)}
                    </td>
                    <td className={sheetTdClass}>{cell(row.agent)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && totalPages > 1 && (
        <div className={sheetFooterClass}>
          <p className="text-sm tabular-nums text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10 cursor-pointer"
              disabled={page <= 1}
              onClick={() => pushParams({ page: String(page - 1) })}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10 cursor-pointer"
              disabled={page >= totalPages}
              onClick={() => pushParams({ page: String(page + 1) })}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
