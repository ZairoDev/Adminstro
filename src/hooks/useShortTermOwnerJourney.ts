"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "@/util/axios";
import type { ShortTermOwnerReadiness } from "@/lib/short-term-owner-readiness";

export type ShortTermJourneyResponse = ShortTermOwnerReadiness & {
  ownerSheetId?: string;
  advertListingStatus?: string;
  owner?: { _id: string; name?: string; email?: string } | null;
  property?: { _id: string; VSID?: string; isLive?: boolean } | null;
};

type JourneyKey = { ownerSheetId?: string; userId?: string };

export function useShortTermOwnerJourney(
  key: JourneyKey | null,
  options?: { enabled?: boolean },
) {
  const enabled = options?.enabled !== false && Boolean(key);
  const [journey, setJourney] = useState<ShortTermJourneyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchJourney = useCallback(async () => {
    if (!key) return null;
    setLoading(true);
    setError(null);
    try {
      const url = key.ownerSheetId
        ? `/api/short-term-owner/${key.ownerSheetId}/journey`
        : key.userId
          ? `/api/short-term-owner/by-user/${key.userId}/journey`
          : null;
      if (!url) return null;
      const res = await axios.get(url);
      setJourney(res.data as ShortTermJourneyResponse);
      return res.data as ShortTermJourneyResponse;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        setJourney(null);
        return null;
      }
      setError("Failed to load listing readiness");
      return null;
    } finally {
      setLoading(false);
    }
  }, [key]);

  useEffect(() => {
    if (!enabled) return;
    void fetchJourney();
  }, [enabled, fetchJourney]);

  return { journey, loading, error, refresh: fetchJourney };
}
