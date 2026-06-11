"use client";

import { useEffect, useState } from "react";
import axios from "@/util/axios";

export type InitiationLimitStatus = {
  limited: boolean;
  limit: number;
  used: number;
  remaining: number;
  atLimit: boolean;
};

export function useInitiationLimit(refreshKey = 0) {
  const [status, setStatus] = useState<InitiationLimitStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await axios.get("/api/whatsapp/initiation-limit");
        if (!cancelled && res.data?.success) {
          setStatus(res.data);
        }
      } catch {
        if (!cancelled) setStatus(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return { status, loading };
}
