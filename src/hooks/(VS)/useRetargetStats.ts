import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getRetargetStats } from "@/actions/(VS)/queryActions";

interface RetargetCounts {
  pending: number;
  retargeted: number;
  blocked: number;
  total: number;
}

interface RetargetStats {
  owners: RetargetCounts;
  guests: RetargetCounts;
}

interface HistogramData {
  date: string;
  Owners: number;
  Guests: number;
}

interface RetargetStatsFilters {
  days?: string;
  location?: string;
}

const useRetargetStats = () => {
  const [filters, setFilters] = useState<RetargetStatsFilters>({
    days: "this month",
    location: "All",
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["retargetStats", filters.days, filters.location],
    queryFn: async () => {
      const result = await getRetargetStats({
        days: filters.days || "this month",
        location: filters.location || "All",
      });
      return {
        counts: result.counts as RetargetStats,
        histogram: result.histogram as HistogramData[],
      };
    },
  });

  const fetchRetargetStats = (nextFilters: RetargetStatsFilters = {}) => {
    setFilters((prev) => ({ ...prev, ...nextFilters }));
  };

  return {
    counts: data?.counts ?? null,
    histogram: data?.histogram ?? [],
    loading: isLoading,
    isError,
    error: error instanceof Error ? error.message : "",
    fetchRetargetStats,
  };
};

export default useRetargetStats;
