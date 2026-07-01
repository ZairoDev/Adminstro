"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "@/util/axios";
import { useCallback } from "react";
import type { IQuery } from "@/util/type";
import type { FilterState } from "@/components/lead-component/NewLeadFilter";
import type { WordsCount } from "@/components/lead-component/PropertyQuickFilters";

export interface LeadListResponse {
  data: IQuery[];
  totalPages: number;
  totalQueries: number;
  wordsCount?: WordsCount[];
  statusCount?: unknown[];
  PAGE?: number;
}

export interface UseLeadListOptions {
  queryKey: string;
  endpoint: string;
  filters: FilterState;
  page: number;
  enabled?: boolean;
}

export function leadListQueryKey(
  queryKey: string,
  endpoint: string,
  filters: FilterState,
  page: number,
) {
  return ["lead-list", queryKey, endpoint, filters, page] as const;
}

async function fetchLeadList(
  endpoint: string,
  filters: FilterState,
  page: number,
): Promise<LeadListResponse> {
  const response = await axios.post<LeadListResponse>(endpoint, {
    filters,
    page,
  });
  return response.data;
}

export function useLeadList({
  queryKey,
  endpoint,
  filters,
  page,
  enabled = true,
}: UseLeadListOptions) {
  const queryClient = useQueryClient();
  const fullQueryKey = leadListQueryKey(queryKey, endpoint, filters, page);

  const query = useQuery({
    queryKey: fullQueryKey,
    queryFn: () => fetchLeadList(endpoint, filters, page),
    enabled,
    placeholderData: (previous) => previous,
  });

  /** True only on first load with no cached/placeholder data — avoids unmounting tables on refetch */
  const isInitialLoading = query.isLoading && query.data === undefined;

  const setQueries = useCallback(
    (updater: React.SetStateAction<IQuery[]>) => {
      queryClient.setQueryData<LeadListResponse>(fullQueryKey, (old) => {
        const prevData = old?.data ?? [];
        const nextData =
          typeof updater === "function" ? updater(prevData) : updater;
        return {
          data: nextData,
          totalPages: old?.totalPages ?? 1,
          totalQueries: old?.totalQueries ?? nextData.length,
          wordsCount: old?.wordsCount,
          statusCount: old?.statusCount,
          PAGE: old?.PAGE ?? page,
        };
      });
    },
    [queryClient, fullQueryKey, page],
  );

  const refetchLeads = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["lead-list", queryKey] }),
    [queryClient, queryKey],
  );

  return {
    queries: query.data?.data ?? [],
    totalPages: query.data?.totalPages ?? 1,
    totalQueries: query.data?.totalQueries ?? 0,
    wordsCount: query.data?.wordsCount ?? [],
    statusCount: query.data?.statusCount,
    loading: isInitialLoading,
    isFetching: query.isFetching,
    setQueries,
    refetchLeads,
    queryKey: fullQueryKey,
  };
}
