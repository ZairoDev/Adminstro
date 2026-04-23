"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { ColumnDef } from "@tanstack/react-table";
import { Toaster } from "@/components/ui/toaster";
import axios from "@/util/axios";
import { useToast } from "@/hooks/use-toast";

import { useFetchOffers, type OfferListFilters, type AnyLeadStatus } from "@/hooks/offers/useFetchOffers";
import { useOrgSelectionStore } from "../useOrgSelectionStore";
import { REJECTION_REASONS } from "@/util/offerConstants";
import type { OfferDoc } from "@/util/type";

import { LeadsTable, type LeadsTableAction } from "../components/leads-table";
import { LeadsFilterBar, type FilterFieldConfig, type FilterValues } from "../components/leads-filter-bar";
import { LeadDetailDrawer } from "../components/lead-detail-drawer";

const FILTER_FIELDS: FilterFieldConfig[] = [
  { key: "search", label: "Search", type: "search", placeholder: "Name, email, phone…" },
  {
    key: "rejectionReason",
    label: "Reason",
    type: "dropdown",
    options: REJECTION_REASONS.map((r) => ({ label: r, value: r })),
    placeholder: "All Reasons",
  },
  { key: "rejectedAtFrom", label: "Rejected From", type: "date" },
  { key: "rejectedAtTo", label: "Rejected To", type: "date" },
];

function getRejectedReason(offer: OfferDoc): string {
  if (offer.rejectionReason?.trim()) return offer.rejectionReason.trim();
  const rejectionEvent = [...(offer.history ?? [])]
    .reverse()
    .find((entry) => entry.type === "rejection" || entry.status === "Reject Lead");
  if (!rejectionEvent?.note) return "Other";
  const match = rejectionEvent.note.match(/Reason:\s*([^—]+)/i);
  if (match?.[1]) return match[1].trim();
  return rejectionEvent.note.trim() || "Other";
}

function getRejectedAt(offer: OfferDoc): string | null {
  if (offer.rejectedAt) return offer.rejectedAt;
  const rejectionEvent = [...(offer.history ?? [])]
    .reverse()
    .find((entry) => entry.type === "rejection" || entry.status === "Reject Lead");
  return rejectionEvent?.createdAt ?? null;
}

const EXTRA_COLUMNS: ColumnDef<OfferDoc>[] = [
  {
    id: "rejectionReason",
    header: "Rejection Reason",
    cell: ({ row }) => (
      <span className="text-xs bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded px-1.5 py-0.5">
        {getRejectedReason(row.original)}
      </span>
    ),
  },
  {
    id: "rejectedAt",
    header: "Rejected At",
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {getRejectedAt(row.original)
          ? format(new Date(getRejectedAt(row.original) as string), "dd MMM yyyy")
          : "—"}
      </span>
    ),
  },
];

export default function RejectedLeadsPage() {
  const { toast } = useToast();
  const { offers, getAllOffers, totalCount, totalPages, isPending } = useFetchOffers();
  const selectedOrg = useOrgSelectionStore((s) => s.selectedOrg);

  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FilterValues>({});
  const [drawerOffer, setDrawerOffer] = useState<OfferDoc | null>(null);

  const load = useCallback(
    (p: number, f: FilterValues) => {
      const apiFilters: OfferListFilters = {
        leadStatus: "Reject Lead" as AnyLeadStatus,
        search: f.search ?? undefined,
        rejectionReason: f.rejectionReason ?? undefined,
        rejectedAtFrom: f.rejectedAtFrom ?? undefined,
        rejectedAtTo: f.rejectedAtTo ?? undefined,
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

  const handleRevert = async (offer: OfferDoc) => {
    try {
      await axios.post(`/api/offers/${offer._id}/revert`, {
        organization: offer.organization,
        note: "Reverted from rejected list",
      });
      toast({ title: "Lead moved back to pending leads" });
      refresh();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "Failed to revert lead";
      toast({ title: msg, variant: "destructive" });
    }
  };

  const actions: LeadsTableAction[] = [
    { label: "Revert to Pending", onClick: handleRevert },
  ];

  return (
    <div className="space-y-4">
      <Toaster />
      <div>
        <h1 className="text-xl font-semibold">Rejected Leads</h1>
        <p className="text-sm text-muted-foreground">Leads marked as rejected with reason and metadata.</p>
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
        actions={actions}
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
