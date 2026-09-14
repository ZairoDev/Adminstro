"use client";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/AuthStore";
import { PipDetailsDialog } from "@/components/pip/PipDetailsDialog";
import axios from "@/util/axios";
import type { PIPRecord } from "@/util/type";
interface PipSummaryResponse {
  activePips: PIPRecord[];
}
export function PipStatusBadge() {
  const token = useAuthStore((state) => state.token);
  const [activePips, setActivePips] = useState<PIPRecord[]>([]);
  useEffect(() => {
    if (!token?.id) {
      setActivePips([]);
      return;
    }
    let cancelled = false;
    const loadActivePips = async () => {
      try {
        const { data } = await axios.get<PipSummaryResponse>(
          "/api/employee/pip/me",
        );
        if (!cancelled) {
          setActivePips(data.activePips ?? []);
        }
      } catch (error) {
        // The mandatory gate owns the blocking/error experience. The secondary
        // badge is best-effort and should not disrupt an otherwise usable dashboard.
        console.error("Failed to load active PIP badge:", error);
      }
    };
    void loadActivePips();
    return () => {
      cancelled = true;
    };
  }, [token?.id]);
  if (activePips.length === 0) return null;
  return <PipDetailsDialog pips={activePips} />;
}