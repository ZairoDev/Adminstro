"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "@/util/axios";
import { useToast } from "@/hooks/use-toast";
import {
  TRAVELLER_BOOKINGS_POLL_MS,
  TRAVELLER_BOOKINGS_SEEN_KEY,
  type TravellerBookingsLatestResponse,
} from "@/types/traveller-booking";

/** Dedupes toasts when multiple components mount this hook */
let lastToastedLatestId: string | null = null;

async function fetchLatestTravellerBookings(): Promise<TravellerBookingsLatestResponse> {
  const res = await axios.get<TravellerBookingsLatestResponse>(
    "/api/traveller-bookings/latest",
    { params: { limit: 50 } },
  );
  return res.data;
}

function readLastSeenId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TRAVELLER_BOOKINGS_SEEN_KEY);
  } catch {
    return null;
  }
}

function writeLastSeenId(id: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (!id) {
      window.localStorage.removeItem(TRAVELLER_BOOKINGS_SEEN_KEY);
      return;
    }
    window.localStorage.setItem(TRAVELLER_BOOKINGS_SEEN_KEY, id);
  } catch {
    // ignore storage failures
  }
}

type UseTravellerBookingsPollOptions = {
  /** When true, toast + badge fire for newly arrived bookings */
  enableNotifications?: boolean;
  /** Page is open — clearing badge on load is expected */
  markSeenOnLoad?: boolean;
};

export function useTravellerBookingsPoll(
  options: UseTravellerBookingsPollOptions = {},
) {
  const { enableNotifications = true, markSeenOnLoad = false } = options;
  const { toast } = useToast();
  const [newCount, setNewCount] = useState(0);
  const [lastSeenId, setLastSeenId] = useState<string | null>(null);
  const primedRef = useRef(false);
  const prevLatestIdRef = useRef<string | null>(null);

  useEffect(() => {
    setLastSeenId(readLastSeenId());
  }, []);

  const query = useQuery({
    queryKey: ["traveller-bookings", "latest"],
    queryFn: fetchLatestTravellerBookings,
    refetchInterval: TRAVELLER_BOOKINGS_POLL_MS,
    refetchIntervalInBackground: true,
    staleTime: TRAVELLER_BOOKINGS_POLL_MS - 500,
  });

  const latestId = query.data?.latestId ?? null;
  const bookings = query.data?.bookings ?? [];

  useEffect(() => {
    if (!latestId) return;

    // First successful poll: establish baseline without toasting historical data
    if (!primedRef.current) {
      primedRef.current = true;
      prevLatestIdRef.current = latestId;

      if (markSeenOnLoad) {
        writeLastSeenId(latestId);
        setLastSeenId(latestId);
        setNewCount(0);
        return;
      }

      const stored = readLastSeenId();
      if (!stored) {
        // First ever visit — don't alarm on the whole backlog
        writeLastSeenId(latestId);
        setLastSeenId(latestId);
        setNewCount(0);
        return;
      }

      if (stored !== latestId) {
        const idx = bookings.findIndex((b) => String(b._id) === stored);
        const unseen = idx === -1 ? bookings.length : idx;
        setNewCount(unseen);
      } else {
        setNewCount(0);
      }
      return;
    }

    // Subsequent polls: detect brand-new tip of the list
    if (
      enableNotifications &&
      prevLatestIdRef.current &&
      prevLatestIdRef.current !== latestId
    ) {
      const tip = bookings[0];
      setNewCount((c) => c + 1);

      if (lastToastedLatestId !== latestId) {
        lastToastedLatestId = latestId;
        toast({
          title: "New mobile booking",
          description: tip
            ? `${tip.primaryGuestName} · ${tip.propertyLabel}`
            : "A new booking request just arrived.",
        });
      }
    }

    prevLatestIdRef.current = latestId;
  }, [latestId, bookings, enableNotifications, markSeenOnLoad, toast]);

  const clearNewBadge = useCallback(() => {
    if (latestId) {
      writeLastSeenId(latestId);
      setLastSeenId(latestId);
    }
    setNewCount(0);
  }, [latestId]);

  return {
    bookings,
    totalCount: query.data?.totalCount ?? 0,
    latestId,
    lastSeenId,
    newCount,
    clearNewBadge,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    polledAt: query.data?.polledAt ?? null,
  };
}
