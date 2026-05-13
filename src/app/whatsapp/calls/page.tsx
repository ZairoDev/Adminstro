"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "@/util/axios";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type CallRow = {
  id: string;
  callId: string;
  conversationId?: string;
  businessPhoneId?: string;
  participantPhone?: string;
  participantName?: string;
  direction: string;
  lifecycleStatus: string;
  metaCallStatus?: string;
  startedAt: string;
  endedAt?: string;
  durationSeconds?: number;
  disconnectReason?: string;
};

export default function WhatsAppCallHistoryPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [calls, setCalls] = useState<CallRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get("/api/whatsapp/calls/history", { params: { limit: 60 } });
        if (cancelled) return;
        if (res.data?.success && Array.isArray(res.data.calls)) {
          setCalls(res.data.calls as CallRow[]);
        } else {
          setCalls([]);
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to load";
        toast({ title: "Error", description: msg, variant: "destructive" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  return (
    <div className="flex min-h-screen flex-col bg-[#f0f2f5] dark:bg-[#0b141a]">
      <header className="flex items-center gap-4 border-b border-[#e9edef] bg-[#008069] px-4 py-3 text-white dark:border-[#2a3942] dark:bg-[#202c33]">
        <Link href="/whatsapp" className="text-sm font-medium text-white/90 hover:underline">
          ← Back to chat
        </Link>
        <h1 className="text-lg font-semibold">WhatsApp call history</h1>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 p-4 md:p-6">
        {loading ? (
          <p className="text-sm text-[#667781] dark:text-[#8696a0]">Loading…</p>
        ) : calls.length === 0 ? (
          <p className="text-sm text-[#667781] dark:text-[#8696a0]">No logged calls yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[#e9edef] bg-white shadow-sm dark:border-[#2a3942] dark:bg-[#111b21]">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-[#e9edef] bg-[#f7f5f3] text-xs uppercase text-[#667781] dark:border-[#2a3942] dark:bg-[#202c33] dark:text-[#8696a0]">
                <tr>
                  <th className="px-3 py-2 font-medium">Started</th>
                  <th className="px-3 py-2 font-medium">Contact</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Meta</th>
                  <th className="px-3 py-2 font-medium">Duration</th>
                  <th className="px-3 py-2 font-medium">Call ID</th>
                </tr>
              </thead>
              <tbody>
                {calls.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-[#f0f2f5] last:border-0 dark:border-[#2a3942]"
                  >
                    <td className="whitespace-nowrap px-3 py-2 text-[#111b21] dark:text-[#e9edef]">
                      {new Date(c.startedAt).toLocaleString()}
                    </td>
                    <td className="max-w-[200px] truncate px-3 py-2 text-[#111b21] dark:text-[#e9edef]">
                      {c.participantName || c.participantPhone || "—"}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                          c.lifecycleStatus === "connected" && "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
                          (c.lifecycleStatus === "failed" || c.lifecycleStatus === "declined") &&
                            "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
                          c.lifecycleStatus === "ended" && "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
                          !["connected", "failed", "declined", "ended"].includes(c.lifecycleStatus) &&
                            "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100",
                        )}
                      >
                        {c.lifecycleStatus}
                      </span>
                    </td>
                    <td className="max-w-[120px] truncate px-3 py-2 text-xs text-[#667781] dark:text-[#8696a0]">
                      {c.metaCallStatus || "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-[#111b21] dark:text-[#e9edef]">
                      {typeof c.durationSeconds === "number" && c.durationSeconds > 0
                        ? `${c.durationSeconds}s`
                        : "—"}
                    </td>
                    <td className="max-w-[140px] truncate px-3 py-2 font-mono text-xs text-[#667781] dark:text-[#8696a0]">
                      {c.callId}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
