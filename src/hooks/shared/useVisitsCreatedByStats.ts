import { useQuery } from "@tanstack/react-query";

import axios from "@/util/axios";

type VisitsCreatedByFilters = { days?: string };

interface VisitsCreatedByResult {
  creators: string[];
  data: Array<{ date: string } & Record<string, number | string>>;
}

async function fetchVisitsCreatedByStats(
  filters: VisitsCreatedByFilters,
): Promise<VisitsCreatedByResult> {
  const res = await axios.get("/api/visits/stats/created-by", {
    params: { days: filters.days || "12 days" },
  });
  if (res.data?.success) {
    return {
      creators: res.data.creators || [],
      data: res.data.data || [],
    };
  }
  throw new Error("Failed to load visit stats");
}

export function useVisitsCreatedByStats(
  filters: VisitsCreatedByFilters,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["visitsCreatedBy", filters.days ?? "this month"],
    queryFn: () => fetchVisitsCreatedByStats(filters),
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}
