"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { ColumnDef } from "@tanstack/react-table";
import { Toaster } from "@/components/ui/toaster";

import { useFetchOffers, type OfferListFilters } from "@/hooks/offers/useFetchOffers";
import { useOrgSelectionStore } from "../useOrgSelectionStore";
import type { OfferDoc } from "@/util/type";

import { LeadsTable } from "../components/leads-table";
import {
  LeadsFilterBar,
  type FilterFieldConfig,
  type FilterValues,
} from "../components/leads-filter-bar";
import { LeadDetailDrawer } from "../components/lead-detail-drawer";
import { LeadStatusBadge } from "../components/lead-status-badge";

const FILTER_FIELDS: FilterFieldConfig[] = [
  { key: "search", label: "Search", type: "search", placeholder: "Name, email, phone…" },
  {
    key: "sortOrder",
    label: "Sort",
    type: "dropdown",
    options: [
      { label: "Newest first", value: "desc" },
      { label: "Oldest first", value: "asc" },
    ],
    placeholder: "Sort by date",
  },
];

const EXTRA_COLUMNS: ColumnDef<OfferDoc>[] = [
  {
    id: "paymentStatus",
    header: "Payment",
    cell: () => <LeadStatusBadge status="Accepted" />,
  },
  {
    id: "updatedAt",
    header: "Payment Marked At",
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {row.original.updatedAt ? format(new Date(row.original.updatedAt), "dd MMM yyyy") : "—"}
      </span>
    ),
  },
];

export default function PaymentCompletePage() {
  const { offers, getAllOffers, totalCount, totalPages, isPending } = useFetchOffers();
  const selectedOrg = useOrgSelectionStore((s) => s.selectedOrg);

  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FilterValues>({});
  const [drawerOffer, setDrawerOffer] = useState<OfferDoc | null>(null);

  const load = useCallback(
    (p: number, f: FilterValues) => {
      const apiFilters: OfferListFilters = {
        offerStatus: "Accepted",
        search: f.search ?? undefined,
        sortBy: "createdAt",
        sortOrder: (f.sortOrder as "asc" | "desc" | undefined) ?? "desc",
      };
      void getAllOffers(apiFilters, p, selectedOrg, 20);
    },
    [getAllOffers, selectedOrg],
  );

  useEffect(() => {
    setPage(1);
  }, [selectedOrg]);
  useEffect(() => {
    load(page, filters);
  }, [page, filters, load]);

  const handleFiltersChange = (next: FilterValues) => {
    setFilters(next);
    setPage(1);
  };
  const handleReset = () => {
    setFilters({});
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <Toaster />
      <div>
        <h1 className="text-xl font-semibold">Payment Complete</h1>
        <p className="text-sm text-muted-foreground">
          Leads with completed payment.
        </p>
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
        onRowClick={setDrawerOffer}
      />

      <LeadDetailDrawer
        offer={drawerOffer}
        open={!!drawerOffer}
        onClose={() => setDrawerOffer(null)}
      />
    </div>
  );
}

