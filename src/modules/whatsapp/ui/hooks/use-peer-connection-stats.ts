"use client";

import { useEffect, useState } from "react";
import { collectWebRtcStats, WA_CALL_STATS_INTERVAL_MS, type WebRtcStatsSnapshot } from "@/lib/whatsapp/calling";

export function usePeerConnectionStats(pc: RTCPeerConnection | null, enabled: boolean): WebRtcStatsSnapshot | null {
  const [snap, setSnap] = useState<WebRtcStatsSnapshot | null>(null);

  useEffect(() => {
    if (!pc || !enabled) {
      setSnap(null);
      return;
    }
    let cancelled = false;
    const tick = async () => {
      try {
        const next = await collectWebRtcStats(pc);
        if (!cancelled) setSnap(next);
      } catch {
        /* ignore */
      }
    };
    void tick();
    const id = window.setInterval(() => void tick(), WA_CALL_STATS_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [pc, enabled]);

  return snap;
}
