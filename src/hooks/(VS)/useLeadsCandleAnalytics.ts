import { useEffect, useMemo, useState } from "react";

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

export function useLeadsCandleAnalytics(initialFilters?: LeadsCandleFilters) {
  const [filters, setFilters] = useState<LeadsCandleFilters>(
    initialFilters ?? { days: "this month", createdBy: "All", location: "All", typeOfProperty: "All" },
  );
  const [days, setDays] = useState<LeadsCandleDay[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState("");

  const refetch = async (next?: LeadsCandleFilters) => {
    const f = next ?? filters;
    setLoading(true);
    setIsError(false);
    setError("");
    try {
      const res = await getLeadsCandleAnalytics(f);
      setDays(Array.isArray(res.days) ? res.days : []);
      setLocations(Array.isArray(res.locations) ? res.locations : []);
    } catch (e: unknown) {
      setIsError(true);
      setError(e instanceof Error ? e.message : "Failed to load analytics");
      setDays([]);
      setLocations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refetch(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    loading,
    isError,
    error,
    refetch,
  };
}

