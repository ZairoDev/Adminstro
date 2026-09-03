"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import axios from "@/util/axios";
import { useAuthStore } from "@/AuthStore";
import {
  isVisitStatusGateSkipped,
  setVisitStatusGateSkipped,
} from "@/lib/visits/visit-status-gate-skip";
import type { OverdueVisitSummary } from "@/lib/visits/overdueVisit";

export type VisitOverdueGateStatus = "loading" | "blocked" | "allowed";

interface OverdueResponse {
  count: number;
  visits: OverdueVisitSummary[];
}

interface VisitOverdueContextValue {
  status: VisitOverdueGateStatus;
  count: number;
  visits: OverdueVisitSummary[];
  refresh: () => Promise<void>;
  skip: () => void;
  canSkip: boolean;
}

const VisitOverdueContext = createContext<VisitOverdueContextValue>({
  status: "allowed",
  count: 0,
  visits: [],
  refresh: async () => undefined,
  skip: () => undefined,
  canSkip: false,
});

export function useVisitOverdue(): VisitOverdueContextValue {
  return useContext(VisitOverdueContext);
}

interface VisitOverdueProviderProps {
  children: ReactNode;
}

export function VisitOverdueProvider({ children }: VisitOverdueProviderProps) {
  const { token } = useAuthStore();
  const [status, setStatus] = useState<VisitOverdueGateStatus>("loading");
  const [count, setCount] = useState(0);
  const [visits, setVisits] = useState<OverdueVisitSummary[]>([]);

  const role = token?.role ?? "";
  const userId = token?.id ? String(token.id) : "";
  const canSkip = role === "SuperAdmin";

  const refresh = useCallback(async () => {
    if (!token) return;

    if (canSkip && userId && isVisitStatusGateSkipped(userId)) {
      setCount(0);
      setVisits([]);
      setStatus("allowed");
      return;
    }

    setStatus((prev) => (prev === "allowed" ? prev : "loading"));
    try {
      const { data } = await axios.get<OverdueResponse>("/api/visits/overdue");
      const nextVisits = data.visits ?? [];
      const nextCount = data.count ?? nextVisits.length;
      setVisits(nextVisits);
      setCount(nextCount);
      setStatus(nextCount > 0 ? "blocked" : "allowed");
    } catch {
      setVisits([]);
      setCount(0);
      setStatus("allowed");
    }
  }, [canSkip, token, userId]);

  const skip = useCallback(() => {
    if (!canSkip || !userId) return;
    setVisitStatusGateSkipped(userId);
    setStatus("allowed");
  }, [canSkip, userId]);

  useEffect(() => {
    if (!token) {
      setCount(0);
      setVisits([]);
      setStatus("allowed");
      return;
    }
    void refresh();
  }, [token, refresh]);

  const value = useMemo(
    () => ({
      status,
      count,
      visits,
      refresh,
      skip,
      canSkip,
    }),
    [canSkip, count, refresh, skip, status, visits],
  );

  return (
    <VisitOverdueContext.Provider value={value}>
      {children}
    </VisitOverdueContext.Provider>
  );
}
