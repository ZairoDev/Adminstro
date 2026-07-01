"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "@/util/axios";
import type { IQuery } from "@/util/type";

interface CompareDailyResponse {
  data: IQuery[];
  totalQueries: number;
  groupedStats?: unknown[];
}

interface CompareMonthlyResponse {
  queries: IQuery[];
}

export function useCompareDailyLeads(
  fromDate: string | null,
  toDate: string | null,
  createdBy?: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: ["compare-daily", fromDate, toDate, createdBy],
    queryFn: async () => {
      if (!fromDate || !toDate) {
        return { data: [], totalQueries: 0 } satisfies CompareDailyResponse;
      }
      let url = `/api/sales/getDailyLeadStats?fromDate=${fromDate}&toDate=${toDate}`;
      if (createdBy) {
        url += `&createdBy=${encodeURIComponent(createdBy)}`;
      }
      const res = await axios.get<CompareDailyResponse>(url);
      return res.data;
    },
    enabled: enabled && !!fromDate && !!toDate,
    placeholderData: (previous) => previous,
  });
}

export function useCompareMonthlyLeads(
  month: string,
  createdBy?: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: ["compare-monthly", month, createdBy],
    queryFn: async () => {
      let url = `/api/sales/monthly-stats?month=${month}`;
      if (createdBy) {
        url += `&createdBy=${encodeURIComponent(createdBy)}`;
      }
      const res = await axios.get<CompareMonthlyResponse>(url);
      return res.data?.queries ?? [];
    },
    enabled: enabled && !!month,
    placeholderData: (previous) => previous,
  });
}
