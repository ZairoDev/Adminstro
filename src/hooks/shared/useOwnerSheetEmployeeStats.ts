import { useQuery } from "@tanstack/react-query";
import axios from "axios";

import type {
  OwnerSheetEmployeeStats,
  OwnerSheetKind,
} from "@/lib/owner-sheet/employee-stats";
import api from "@/util/axios";

export interface OwnerSheetEmployeeFilters {
  from: string;
  to: string;
  location: string;
  sheet: OwnerSheetKind;
}

async function fetchOwnerSheetEmployeeStats(
  filters: OwnerSheetEmployeeFilters,
): Promise<OwnerSheetEmployeeStats> {
  try {
    const response = await api.get<OwnerSheetEmployeeStats>(
      "/api/unregisteredOwners/stats/by-employee",
      {
        params: {
          from: filters.from,
          to: filters.to,
          location: filters.location,
          sheet: filters.sheet,
        },
      },
    );
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.error;
      if (typeof message === "string" && message.trim()) {
        throw new Error(message);
      }
    }
    throw error;
  }
}

export function useOwnerSheetEmployeeStats(
  filters: OwnerSheetEmployeeFilters,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["ownerSheetEmployeeStats", filters],
    queryFn: () => fetchOwnerSheetEmployeeStats(filters),
    enabled: enabled && Boolean(filters.from && filters.to),
    staleTime: 60 * 1000,
  });
}
