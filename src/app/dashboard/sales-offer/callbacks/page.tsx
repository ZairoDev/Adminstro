"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { ColumnDef } from "@tanstack/react-table";
import { Toaster } from "@/components/ui/toaster";

import { useFetchOffers, type OfferListFilters } from "@/hooks/offers/useFetchOffers";
import { useOrgSelectionStore } from "../useOrgSelectionStore";
import type { OfferDoc } from "@/util/type";

import { LeadsTable } from "../components/leads-table";
import { LeadsFilterBar, type FilterFieldConfig, type FilterValues } from "../components/leads-filter-bar";
import { LeadDetailDrawer } from "../components/lead-detail-drawer";
import { AddCallbackDialog } from "../components/action-dialogs";

const FILTER_FIELDS: FilterFieldConfig[] = [
  { key: "search", label: "Search", type: "search", placeholder: "Name, email, phone…" },
  { key: "callbackDateFrom", label: "Callback From", type: "date" },
  { key: "callbackDateTo", label: "Callback To", type: "date" },
];

function lastCallbackDate(offer: OfferDoc): string {
  if (!offer.callbacks?.length) {
    return offer.callBackDate
      ? format(new Date(offer.callBackDate), "dd MMM yyyy")
      : "—";
  }
  const sorted = [...offer.callbacks].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  return format(new Date(sorted[0].date), "dd MMM yyyy");
}

const EXTRA_COLUMNS: ColumnDef<OfferDoc>[] = [
  {
    id: "lastCallback",
    header: "Last Callback",
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {lastCallbackDate(row.original)}
      </span>
    ),
  },
  {
    id: "callbackCount",
    header: "#",
    cell: ({ row }) => (
      <span className="text-xs font-medium">{row.original.callbacks?.length ?? 0}</span>
    ),
  },
];

export default function CallbacksPage() {
  const { offers, getAllOffers, totalCount, totalPages, isPending } = useFetchOffers();
  const selectedOrg = useOrgSelectionStore((s) => s.selectedOrg);

  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FilterValues>({});
  const [drawerOffer, setDrawerOffer] = useState<OfferDoc | null>(null);
  const [callbackTarget, setCallbackTarget] = useState<OfferDoc | null>(null);

  const load = useCallback(
    (p: number, f: FilterValues) => {
      const apiFilters: OfferListFilters = {
        leadStatus: "Call Back",
        search: f.search ?? undefined,
        callbackDateFrom: f.callbackDateFrom ?? undefined,
        callbackDateTo: f.callbackDateTo ?? undefined,
      };
      void getAllOffers(apiFilters, p, selectedOrg, 20);
    },
    [getAllOffers, selectedOrg],
  );

  useEffect(() => { setPage(1); }, [selectedOrg]);
  useEffect(() => { load(page, filters); }, [page, filters, load]);

  const handleFiltersChange = (next: FilterValues) => { setFilters(next); setPage(1); };
  const handleReset = () => { setFilters({}); setPage(1); };
  const refresh = () => load(page, filters);

  return (
    <div className="space-y-4">
      <Toaster />
      <div>
        <h1 className="text-xl font-semibold">Callbacks</h1>
        <p className="text-sm text-muted-foreground">Leads with scheduled callbacks.</p>
      </div>

      <LeadsFilterBar
        fields={FILTER_FIELDS}
        values={filters}
        onChange={handleFiltersChange}
        onReset={handleReset}
        isLoading={isPending}
      />

      <LeadsTable
        offers={offers}
        page={page}
        totalCount={totalCount}
        totalPages={totalPages}
        onPageChange={setPage}
        isLoading={isPending}
        extraColumns={EXTRA_COLUMNS}
        actions={[
          { label: "Add Callback", onClick: (o) => setCallbackTarget(o) },
        ]}
        onRowClick={setDrawerOffer}
      />

      <LeadDetailDrawer
        offer={drawerOffer}
        open={!!drawerOffer}
        onClose={() => setDrawerOffer(null)}
      />

      <AddCallbackDialog
        open={!!callbackTarget}
        offer={callbackTarget}
        onClose={() => setCallbackTarget(null)}
        onSuccess={refresh}
      />
    </div>
  );
}
