import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  getLeadsCandleAnalytics,
  type LeadsCandleDay,
} from "@/actions/(VS)/queryActions";

export type LeadsCandleFilters = {
  days?: string;
  /** Multi-select filters; empty/undefined = All. */
  createdBy?: string[];
  typeOfProperty?: string[];
  locations?: string[];
  /** Price range on the lead's maxBudget (@/util/pricingRule semantics). */
  priceFrom?: number | null;
  priceTo?: number | null;
  dateFrom?: string;
  dateTo?: string;
};

const defaultFilters: LeadsCandleFilters = {
  days: "this month",
  createdBy: [],
  locations: [],
  typeOfProperty: [],
};

export function useLeadsCandleAnalytics(initialFilters?: LeadsCandleFilters) {
  const [filters, setFilters] = useState<LeadsCandleFilters>(
    initialFilters ?? defaultFilters,
  );

  const { data, isLoading, isError, error } = useQuery({
    queryKey: [
      "leadsCandleAnalytics",
      filters.locations?.join("|") ?? "",
      filters.days ?? null,
      filters.createdBy?.join("|") ?? "",
      filters.typeOfProperty?.join("|") ?? "",
      filters.priceFrom ?? null,
      filters.priceTo ?? null,
      filters.dateFrom ?? null,
      filters.dateTo ?? null,
    ],
    queryFn: async () => {
      const res = await getLeadsCandleAnalytics(filters);
      return {
        days: (Array.isArray(res.days) ? res.days : []) as LeadsCandleDay[],
        locations: (Array.isArray(res.locations) ? res.locations : []) as string[],
        locationOptions: (Array.isArray(res.locationOptions)
          ? res.locationOptions
          : []) as string[],
      };
    },
  });

  const days = data?.days ?? [];
  const locations = data?.locations ?? [];
  const locationOptions = data?.locationOptions ?? [];

  const refetch = async (next?: LeadsCandleFilters) => {
    if (next) {
      setFilters(next);
    }
  };

  const total = useMemo(
    () => days.reduce((acc, d) => acc + (d.total || 0), 0),
    [days],
  );

  return {
    filters,
    setFilters,
    days,
    locations,
    locationOptions,
    total,
    loading: isLoading,
    isError,
    error: error instanceof Error ? error.message : "",
    refetch,
  };
}
