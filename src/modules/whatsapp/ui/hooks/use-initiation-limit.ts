"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "@/util/axios";
import { deferUntilIdle } from "../lib/deferUntilIdle";

export type InitiationLimitStatus = {
  limited: boolean;
  limit: number;
  /** Confirmed = guest replied after first outbound */
  used: number;
  /** Delivered today, awaiting guest reply */
  pending?: number;
  /** Accepted by Meta today, awaiting delivery */
  inFlight?: number;
  remaining: number;
  atLimit: boolean;
};

export const INITIATION_LIMIT_QUERY_KEY = ["whatsappInitiationLimit"] as const;

/**
 * Fetches the guest-initiation limit status.
 * React Query deduplicates concurrent callers — only ONE request fires regardless
 * of how many components mount this hook simultaneously.
 *
 * @param refreshKey   Increment to trigger an immediate refetch (e.g. after a new guest message is sent).
 * @param options.deferStartup  When true (default), first fetch waits until browser idle.
 */
export function useInitiationLimit(
  refreshKey = 0,
  options?: { deferStartup?: boolean },
) {
  const deferStartup = options?.deferStartup ?? true;
  const shouldDeferInitialFetch = deferStartup && refreshKey === 0;
  const [startupReady, setStartupReady] = useState(!shouldDeferInitialFetch);

  useEffect(() => {
    if (!shouldDeferInitialFetch) {
      setStartupReady(true);
      return;
    }
    return deferUntilIdle(() => setStartupReady(true), {
      timeoutMs: 3000,
      fallbackMs: 2000,
    });
  }, [shouldDeferInitialFetch]);

  const { data, isLoading } = useQuery<InitiationLimitStatus>({
    // Include refreshKey in the query key so incrementing it forces a fresh fetch.
    queryKey: [...INITIATION_LIMIT_QUERY_KEY, refreshKey],
    queryFn: async () => {
      const res = await axios.get("/api/whatsapp/initiation-limit");
      if (!res.data?.success) throw new Error("initiation-limit fetch failed");
      return res.data as InitiationLimitStatus;
    },
    enabled: startupReady,
    staleTime: 30 * 1000,      // treat data as fresh for 30 s (badge polls every 5 min anyway)
    gcTime: 2 * 60 * 1000,    // keep in cache for 2 min after last subscriber unmounts
    retry: 1,
    refetchOnWindowFocus: false,
  });

  return { status: data ?? null, loading: isLoading };
}
