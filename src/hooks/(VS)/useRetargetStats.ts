import { useState, useEffect } from "react";
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
  const [counts, setCounts] = useState<RetargetStats | null>(null);
  const [histogram, setHistogram] = useState<HistogramData[]>([]);
  const [loading, setLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState("");

  const fetchRetargetStats = async (filters: RetargetStatsFilters = {}) => {
    setLoading(true);
    setIsError(false);
    setError("");

    try {
      const result = await getRetargetStats({
        days: filters.days || "this month",
        location: filters.location || "All",
      });

      setCounts(result.counts);
      setHistogram(result.histogram);
    } catch (err: any) {
      setIsError(true);
      setError(err.message || "Failed to fetch retarget stats");
      console.error("Error fetching retarget stats:", err);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch with default filters
  useEffect(() => {
    fetchRetargetStats({ days: "this month", location: "All" });
  }, []);

  return {
    counts,
    histogram,
    loading,
    isError,
    error,
    fetchRetargetStats,
  };
};

export default useRetargetStats;

