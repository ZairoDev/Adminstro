"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "@/util/axios";
import { useAuthStore } from "@/AuthStore";

/** Same roles that can approve or reject leave. */
const LEAVE_DECISION_ROLES = new Set(["SuperAdmin", "Admin", "HR"]);

export const pendingLeaveCountQueryKey = ["attendance", "pending-leave-count"] as const;

type PendingLeaveCountResponse = {
  success: boolean;
  data?: { count?: number };
};

async function fetchPendingLeaveCount(): Promise<number> {
  const response = await axios.get<PendingLeaveCountResponse>("/api/attendance/leaves/pending-count");
  return response.data.data?.count ?? 0;
}

export function usePendingLeaveDecisions() {
  const role = useAuthStore((state) => state.token?.role ?? "");
  const enabled = LEAVE_DECISION_ROLES.has(role);
  const query = useQuery({
    queryKey: pendingLeaveCountQueryKey,
    queryFn: fetchPendingLeaveCount,
    enabled,
    staleTime: 30 * 1000,
    refetchInterval: enabled ? 60 * 1000 : false,
    refetchOnWindowFocus: true,
  });

  return {
    count: enabled ? (query.data ?? 0) : 0,
  };
}

export function useRefreshPendingLeaveCount() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: pendingLeaveCountQueryKey });
  };
}
