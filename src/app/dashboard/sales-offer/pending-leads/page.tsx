"use client";

import { useCallback, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import axios from "@/util/axios";
import { useToast } from "@/hooks/use-toast";

import { useFetchOffers, type OfferListFilters } from "@/hooks/offers/useFetchOffers";
import { useOrgSelectionStore } from "../useOrgSelectionStore";
import type { OfferDoc } from "@/util/type";

import { LeadsTable, type LeadsTableAction } from "../components/leads-table";
import { LeadsFilterBar, type FilterFieldConfig, type FilterValues } from "../components/leads-filter-bar";
import { LeadDetailDrawer } from "../components/lead-detail-drawer";
import {
  AddCallbackDialog,
  RejectLeadDialog,
  BlacklistLeadDialog,
  UpdateOfferDialog,
  SendReminderDialog,
  SendRebuttalDialog,
} from "../components/action-dialogs";
import { BulkActionBar } from "../components/bulk-action-bar";

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

const PENDING_STATUSES = [
  "Not Connected",
  "Not Interested",
  "Language Barrier",
  "Call Back",
  "Send Offer",
];

export default function PendingLeadsPage() {
  const { toast } = useToast();
  const { offers, getAllOffers, totalCount, totalPages, isPending } = useFetchOffers();
  const selectedOrg = useOrgSelectionStore((s) => s.selectedOrg);

  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FilterValues>({});

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [drawerOffer, setDrawerOffer] = useState<OfferDoc | null>(null);
  const [callbackTarget, setCallbackTarget] = useState<OfferDoc | null>(null);
  const [rejectTarget, setRejectTarget] = useState<OfferDoc | null>(null);
  const [blacklistTarget, setBlacklistTarget] = useState<OfferDoc | null>(null);
  const [updateOfferTarget, setUpdateOfferTarget] = useState<OfferDoc | null>(null);
  const [reminderTarget, setReminderTarget] = useState<OfferDoc | null>(null);
  const [rebuttalTarget, setRebuttalTarget] = useState<OfferDoc | null>(null);

  const pendingOffers = offers.filter((o) =>
    (PENDING_STATUSES.includes(o.leadStatus) || !o.leadStatus) && o.offerStatus !== "Accepted",
  );
  const selectedOffers = pendingOffers.filter((o) => selectedIds.has(o._id));

  const load = useCallback(
    (p: number, f: FilterValues) => {
      const apiFilters: OfferListFilters = {
        search: f.search ?? undefined,
        sortBy: "createdAt",
        sortOrder: (f.sortOrder as "asc" | "desc" | undefined) ?? "desc",
      };
      void getAllOffers(apiFilters, p, selectedOrg, 20);
    },
    [getAllOffers, selectedOrg],
  );

  useEffect(() => { setPage(1); }, [selectedOrg]);
  useEffect(() => { load(page, filters); }, [page, filters, load]);

  const handleFiltersChange = (next: FilterValues) => {
    setFilters(next);
    setPage(1);
  };

  const handleReset = () => {
    setFilters({});
    setPage(1);
  };

  const refresh = () => load(page, filters);

  const handlePaymentComplete = async (offer: OfferDoc) => {
    try {
      await axios.post(`/api/offers/${offer._id}/payment-complete`, {
        organization: offer.organization,
        note: "Manually marked as payment complete",
      });
      toast({ title: "Payment marked complete" });
      refresh();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "Failed to mark payment complete";
      toast({ title: msg, variant: "destructive" });
    }
  };

  const actions: LeadsTableAction[] = [
    {
      label: "Add Callback",
      onClick: (offer) => setCallbackTarget(offer),
    },
    {
      label: "Reject",
      onClick: (offer) => setRejectTarget(offer),
    },
    {
      label: "Blacklist",
      onClick: (offer) => setBlacklistTarget(offer),
    },
    {
      label: "Update Offer",
      onClick: (offer) => setUpdateOfferTarget(offer),
      show: (offer) => offer.leadStatus !== "Blacklist Lead" && offer.leadStatus !== "Reject Lead",
    },
    {
      label: "Complete Payment",
      onClick: handlePaymentComplete,
      show: (offer) =>
        offer.leadStatus !== "Blacklist Lead" &&
        offer.leadStatus !== "Reject Lead" &&
        offer.offerStatus !== "Accepted",
    },
    {
      label: "Send Reminder",
      onClick: (offer) => setReminderTarget(offer),
      show: (offer) => offer.offerStatus !== "Accepted",
    },
    {
      label: "Send Rebuttal",
      onClick: (offer) => setRebuttalTarget(offer),
      show: (offer) => offer.leadStatus === "Reject Lead" || offer.leadStatus === "Not Interested",
    },
  ];

  return (
    <div className="space-y-4">
      <Toaster />
      <div>
        <h1 className="text-xl font-semibold">Pending Leads</h1>
        <p className="text-sm text-muted-foreground">
          Leads awaiting action — call back, reject, blacklist, or update offer.
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
        offers={pendingOffers}
        page={page}
        totalCount={totalCount}
        totalPages={totalPages}
        onPageChange={setPage}
        isLoading={isPending}
        actions={actions}
        onRowClick={setDrawerOffer}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        bulkActionBar={
          selectedOffers.length > 0 ? (
            <BulkActionBar
              selectedOffers={selectedOffers}
              onSuccess={refresh}
              onClear={() => setSelectedIds(new Set())}
            />
          ) : undefined
        }
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

      <RejectLeadDialog
        open={!!rejectTarget}
        offer={rejectTarget}
        onClose={() => setRejectTarget(null)}
        onSuccess={refresh}
      />

      <BlacklistLeadDialog
        open={!!blacklistTarget}
        offer={blacklistTarget}
        onClose={() => setBlacklistTarget(null)}
        onSuccess={refresh}
      />

      <UpdateOfferDialog
        open={!!updateOfferTarget}
        offer={updateOfferTarget}
        onClose={() => setUpdateOfferTarget(null)}
        onSuccess={refresh}
      />

      <SendReminderDialog
        open={!!reminderTarget}
        offer={reminderTarget}
        onClose={() => setReminderTarget(null)}
        onSuccess={refresh}
      />

      <SendRebuttalDialog
        open={!!rebuttalTarget}
        offer={rebuttalTarget}
        onClose={() => setRebuttalTarget(null)}
        onSuccess={refresh}
      />
    </div>
  );
}
