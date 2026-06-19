import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  getLeadsCandleAnalytics,
  type LeadsCandleDay,
} from "@/actions/(VS)/queryActions";

export type LeadsCandleFilters = {
  days?: string;
  createdBy?: string;
  typeOfProperty?: string;
  location?: string;
  dateFrom?: string;
  dateTo?: string;
};

const defaultFilters: LeadsCandleFilters = {
  days: "this month",
  createdBy: "All",
  location: "All",
  typeOfProperty: "All",
};

export function useLeadsCandleAnalytics(initialFilters?: LeadsCandleFilters) {
  const [filters, setFilters] = useState<LeadsCandleFilters>(
    initialFilters ?? defaultFilters,
  );

  const { data, isLoading, isError, error } = useQuery({
    queryKey: [
      "leadsCandleAnalytics",
      filters.location ?? "All",
      filters.days ?? null,
      filters.createdBy ?? "All",
      filters.typeOfProperty ?? "All",
      filters.dateFrom ?? null,
      filters.dateTo ?? null,
    ],
    queryFn: async () => {
      const res = await getLeadsCandleAnalytics(filters);
      return {
        days: (Array.isArray(res.days) ? res.days : []) as LeadsCandleDay[],
        locations: (Array.isArray(res.locations) ? res.locations : []) as string[],
      };
    },
  });

  const days = data?.days ?? [];
  const locations = data?.locations ?? [];

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
    total,
    loading: isLoading,
    isError,
    error: error instanceof Error ? error.message : "",
    refetch,
  };
}
