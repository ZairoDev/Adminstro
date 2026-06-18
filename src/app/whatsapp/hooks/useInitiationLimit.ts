"use client";

import { useEffect, useState } from "react";
import axios from "@/util/axios";

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

export function useInitiationLimit(
  refreshKey = 0,
  pollIntervalMs = 0,
) {
  const [status, setStatus] = useState<InitiationLimitStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchStatus = async (showLoading: boolean) => {
      if (showLoading) setLoading(true);
      try {
        const res = await axios.get("/api/whatsapp/initiation-limit");
        if (!cancelled && res.data?.success) {
          setStatus(res.data);
        }
      } catch {
        if (!cancelled) setStatus(null);
      } finally {
        if (!cancelled && showLoading) setLoading(false);
      }
    };

    void fetchStatus(true);

    if (pollIntervalMs > 0) {
      const intervalId = window.setInterval(() => {
        void fetchStatus(false);
      }, pollIntervalMs);
      return () => {
        cancelled = true;
        window.clearInterval(intervalId);
      };
    }

    return () => {
      cancelled = true;
    };
  }, [refreshKey, pollIntervalMs]);

  return { status, loading };
}
