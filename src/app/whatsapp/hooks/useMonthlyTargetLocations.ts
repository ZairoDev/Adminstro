"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "@/util/axios";
import { parseMonthlyTargetLocationNames } from "@/util/monthlyTargetLocations";

export const MONTHLY_TARGET_LOCATIONS_QUERY_KEY = [
  "monthlyTargetLocations",
] as const;

/**
 * Shared cache for SuperAdmin inbox location options.
 * Defers until `enabled` — callers should pass enabled after inbox filters resolve.
 */
export function useMonthlyTargetLocations(enabled: boolean) {
  return useQuery<string[]>({
    queryKey: MONTHLY_TARGET_LOCATIONS_QUERY_KEY,
    queryFn: async () => {
      const response = await axios.get("/api/monthlyTargets/getLocations");
      const names = parseMonthlyTargetLocationNames(response.data?.locations);
      return [...new Set(names)].sort((a, b) => a.localeCompare(b));
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    enabled,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
