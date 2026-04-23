import axios from "@/util/axios";
import { useCallback, useState } from "react";

import type { OfferDoc } from "@/util/type";
import { LeadStatus } from "@/app/dashboard/sales-offer/sales-offer-utils";
import type { Organization } from "@/util/organizationConstants";
import { backfillOffersCallbacks } from "@/util/offerSerialize";

export type AnyLeadStatus = LeadStatus | "Reject Lead" | "Blacklist Lead";

export interface OfferListFilters {
  leadStatus?: AnyLeadStatus | null;
  offerStatus?: string;
  employeeId?: string;
  rejectionReason?: string;
  blacklistReason?: string;
  callbackDateFrom?: string;
  callbackDateTo?: string;
  rejectedAtFrom?: string;
  rejectedAtTo?: string;
  blacklistedAtFrom?: string;
  blacklistedAtTo?: string;
  search?: string;
}

export const useFetchOffers = () => {
  const [offers, setOffers] = useState<OfferDoc[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  const getAllOffers = useCallback(
    async (
      filters: OfferListFilters | LeadStatus | null,
      page?: number,
      organization?: Organization | null,
      pageSize?: number,
    ) => {
      setIsPending(true);
      try {
        const params: Record<string, string | number> = {
          page: page ?? 1,
          pageSize: pageSize ?? 20,
        };
        if (organization) params.organization = organization;

        if (typeof filters === "string" && filters) {
          params.leadStatus = filters;
        } else if (filters && typeof filters === "object") {
          if (filters.leadStatus) params.leadStatus = filters.leadStatus;
          if (filters.offerStatus) params.offerStatus = filters.offerStatus;
          if (filters.employeeId) params.employeeId = filters.employeeId;
          if (filters.rejectionReason) params.rejectionReason = filters.rejectionReason;
          if (filters.blacklistReason) params.blacklistReason = filters.blacklistReason;
          if (filters.callbackDateFrom) params.callbackDateFrom = filters.callbackDateFrom;
          if (filters.callbackDateTo) params.callbackDateTo = filters.callbackDateTo;
          if (filters.rejectedAtFrom) params.rejectedAtFrom = filters.rejectedAtFrom;
          if (filters.rejectedAtTo) params.rejectedAtTo = filters.rejectedAtTo;
          if (filters.blacklistedAtFrom) params.blacklistedAtFrom = filters.blacklistedAtFrom;
          if (filters.blacklistedAtTo) params.blacklistedAtTo = filters.blacklistedAtTo;
          if (filters.search) params.search = filters.search;
        }

        const response = await axios.get("/api/offers", { params });
        const rawItems: OfferDoc[] = response.data.data ?? response.data.items ?? [];
        setOffers(backfillOffersCallbacks(rawItems));
        setTotalCount(response.data.totalCount ?? response.data.total ?? 0);
        setTotalPages(response.data.totalPages);
      } catch (err) {
        console.error("error in getting offers: ", err);
        setError(err as string);
      } finally {
        setIsPending(false);
      }
    },
    [],
  );

  return { offers, setOffers, getAllOffers, totalCount, totalPages, error, isPending };
};
