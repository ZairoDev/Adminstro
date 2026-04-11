"use client";

import { useEffect, useMemo, useState } from "react";

import { useFetchOffers } from "@/hooks/offers/useFetchOffers";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { OfferTable } from "../components/offer-table";
import { leadStatuses, type LeadStatus } from "../sales-offer-utils";
import { useOrgSelectionStore } from "../useOrgSelectionStore";

type TabDef = { key: string; label: string; leadStatus: LeadStatus | null };

const TABS: TabDef[] = [
  { key: "all", label: "All", leadStatus: null },
  ...leadStatuses.map((s) => ({ key: s, label: s, leadStatus: s })),
];

export default function SentOffersPage() {
  const { offers, getAllOffers, totalPages, isPending } = useFetchOffers();
  const selectedOrg = useOrgSelectionStore((s) => s.selectedOrg);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [page, setPage] = useState(1);

  const activeDef = useMemo(
    () => TABS.find((t) => t.key === activeTab) ?? TABS[0],
    [activeTab],
  );

  useEffect(() => {
    setPage(1);
  }, [activeTab, selectedOrg]);

  useEffect(() => {
    void getAllOffers(activeDef.leadStatus, page, selectedOrg);
  }, [activeDef.leadStatus, page, selectedOrg, getAllOffers]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Sent offers</h1>
      <p className="text-sm text-muted-foreground">
        Filter by lead status for the organization selected above.
      </p>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex h-auto min-h-10 w-full flex-wrap justify-start gap-1">
          {TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key} className="text-xs sm:text-sm">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="mt-4">
        {isPending ? (
          <p>Loading...</p>
        ) : (
          <OfferTable
            offers={offers}
            page={page}
            setPage={setPage}
            totalPages={totalPages}
          />
        )}
      </div>
    </div>
  );
}
