"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { ColumnDef } from "@tanstack/react-table";
import axios from "@/util/axios";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { useAuthStore } from "@/AuthStore";

import { useFetchOffers, type OfferListFilters, type AnyLeadStatus } from "@/hooks/offers/useFetchOffers";
import { useOrgSelectionStore } from "../useOrgSelectionStore";
import type { OfferDoc } from "@/util/type";

import { LeadsTable, type LeadsTableAction } from "../components/leads-table";
import { LeadsFilterBar, type FilterFieldConfig, type FilterValues } from "../components/leads-filter-bar";
import { LeadDetailDrawer } from "../components/lead-detail-drawer";

const ADMIN_ROLES = ["SuperAdmin", "HAdmin", "Admin"];

const FILTER_FIELDS: FilterFieldConfig[] = [
  { key: "search", label: "Search", type: "search", placeholder: "Name, email, phone…" },
  { key: "blacklistedAtFrom", label: "Blacklisted From", type: "date" },
  { key: "blacklistedAtTo", label: "Blacklisted To", type: "date" },
];

const EXTRA_COLUMNS: ColumnDef<OfferDoc>[] = [
  {
    id: "blacklistReason",
    header: "Blacklist Reason",
    cell: ({ row }) => (
      <span className="text-xs bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 rounded px-1.5 py-0.5">
        {row.original.blacklistReason || "—"}
      </span>
    ),
  },
  {
    id: "blacklistedAt",
    header: "Blacklisted At",
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {row.original.blacklistedAt
          ? format(new Date(row.original.blacklistedAt), "dd MMM yyyy")
          : "—"}
      </span>
    ),
  },
];

export default function BlacklistedLeadsPage() {
  const { toast } = useToast();
  const token = useAuthStore((s) => s.token);
  const role = token?.role ?? "";
  const isAdmin = ADMIN_ROLES.includes(role);

  const { offers, getAllOffers, totalCount, totalPages, isPending } = useFetchOffers();
  const selectedOrg = useOrgSelectionStore((s) => s.selectedOrg);

  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FilterValues>({});
  const [drawerOffer, setDrawerOffer] = useState<OfferDoc | null>(null);

  const load = useCallback(
    (p: number, f: FilterValues) => {
      const apiFilters: OfferListFilters = {
        leadStatus: "Blacklist Lead" as AnyLeadStatus,
        search: f.search ?? undefined,
        blacklistedAtFrom: f.blacklistedAtFrom ?? undefined,
        blacklistedAtTo: f.blacklistedAtTo ?? undefined,
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
        note: "Reverted from blacklisted list",
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

  const actions: LeadsTableAction[] = isAdmin
    ? [{ label: "Revert to Pending", onClick: handleRevert }]
    : [];

  return (
    <div className="space-y-4">
      <Toaster />
      <div>
        <h1 className="text-xl font-semibold">Blacklisted Leads</h1>
        <p className="text-sm text-muted-foreground">
          Leads permanently blocked.
          {!isAdmin && " Contact an Admin to remove from blacklist."}
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
