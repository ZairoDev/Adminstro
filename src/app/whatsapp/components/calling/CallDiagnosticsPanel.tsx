"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { WebRtcStatsSnapshot } from "@/lib/whatsapp/calling";

export type CallDiagnosticsPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stats: WebRtcStatsSnapshot | null;
  signalingState: string;
  connectionState: string;
  iceState: string;
  relayConfigured: boolean;
  keptCandidates: string[];
  droppedCandidates: { line: string; reason: string }[];
  gatheredCandidates?: { candidate: string; typ: string | null }[];
  metaOfferSdpPreview?: string;
  lastAnswerSdpPreview?: string;
};

function fmtNum(n: number | undefined, digits = 1): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toFixed(digits);
}

export function CallDiagnosticsPanel({
  open,
  onOpenChange,
  stats,
  signalingState,
  connectionState,
  iceState,
  relayConfigured,
  keptCandidates,
  droppedCandidates,
  gatheredCandidates = [],
  metaOfferSdpPreview,
  lastAnswerSdpPreview,
}: CallDiagnosticsPanelProps) {
  const [candOpen, setCandOpen] = useState(false);
  const [sdpOpen, setSdpOpen] = useState(false);

  const summary = useMemo(() => {
    if (!stats) return null;
    return [
      `RTT ${fmtNum(stats.rttMs, 0)} ms`,
      `jitter ${fmtNum(stats.jitterMs, 2)} ms`,
      stats.packetsLost != null ? `lost ${stats.packetsLost}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }, [stats]);

  return (
    <Collapsible open={open} onOpenChange={onOpenChange} className="w-full text-left">
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg bg-black/25 px-3 py-2 text-xs font-medium text-white/90 hover:bg-black/35">
        <span>Developer diagnostics</span>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 max-h-[40vh] space-y-2 overflow-y-auto rounded-lg bg-black/30 p-3 text-[11px] leading-snug text-white/85">
        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
          <span className="text-white/55">signaling</span>
          <span className="font-mono">{signalingState}</span>
          <span className="text-white/55">connection</span>
          <span className="font-mono">{connectionState}</span>
          <span className="text-white/55">ICE</span>
          <span className="font-mono">{iceState}</span>
          <span className="text-white/55">TURN relay</span>
          <span className={cn("font-mono", relayConfigured ? "text-emerald-300" : "text-amber-300")}>
            {relayConfigured ? "configured" : "not configured"}
          </span>
          {stats?.localCandidateType ? (
            <>
              <span className="text-white/55">local typ</span>
              <span className="font-mono">{stats.localCandidateType}</span>
            </>
          ) : null}
          {stats?.remoteCandidateType ? (
            <>
              <span className="text-white/55">remote typ</span>
              <span className="font-mono">{stats.remoteCandidateType}</span>
            </>
          ) : null}
          {stats?.transport ? (
            <>
              <span className="text-white/55">transport</span>
              <span className="font-mono">{stats.transport}</span>
            </>
          ) : null}
        </div>
        {summary ? <p className="border-t border-white/10 pt-2 text-white/80">{summary}</p> : null}
        {stats ? (
          <dl className="grid grid-cols-2 gap-x-2 gap-y-1 border-t border-white/10 pt-2 font-mono text-[10px]">
            <dt className="text-white/50">rx bytes</dt>
            <dd>{stats.bytesReceived ?? "—"}</dd>
            <dt className="text-white/50">tx bytes</dt>
            <dd>{stats.bytesSent ?? "—"}</dd>
            <dt className="text-white/50">packetsSent</dt>
            <dd>{stats.packetsSent ?? "—"}</dd>
            <dt className="text-white/50">packetsReceived</dt>
            <dd>{stats.packetsReceived ?? "—"}</dd>
            <dt className="text-white/50">audioLevel</dt>
            <dd>{stats.audioLevel != null ? stats.audioLevel.toFixed(3) : "—"}</dd>
          </dl>
        ) : null}

        {gatheredCandidates.length > 0 ? (
          <div className="border-t border-white/10 pt-2">
            <div className="text-white/50">Browser gathered ({gatheredCandidates.length})</div>
            <div className="mt-1 max-h-20 overflow-y-auto rounded bg-black/25 p-2 font-mono text-[9px] text-sky-200/90">
              {gatheredCandidates.map((g, i) => (
                <div key={`${g.candidate}-${i}`} className="break-all">
                  {g.typ ? `[${g.typ}] ` : ""}
                  {g.candidate}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <Collapsible open={candOpen} onOpenChange={setCandOpen} className="border-t border-white/10 pt-2">
          <CollapsibleTrigger className="flex w-full items-center gap-1 text-white/80">
            {candOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Meta SDP (kept {keptCandidates.length}, dropped {droppedCandidates.length})
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-1 max-h-28 overflow-y-auto rounded bg-black/25 p-2 font-mono text-[9px] text-emerald-200/90">
            {keptCandidates.map((l) => (
              <div key={l} className="break-all">
                {l}
              </div>
            ))}
            {droppedCandidates.map((d) => (
              <div key={d.line} className="break-all text-amber-200/80">
                [{d.reason}] {d.line}
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>

        <Collapsible open={sdpOpen} onOpenChange={setSdpOpen} className="border-t border-white/10 pt-2">
          <CollapsibleTrigger className="flex w-full items-center gap-1 text-white/80">
            {sdpOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            SDP previews
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-1 space-y-2">
            <div>
              <div className="text-white/50">Meta offer (clean)</div>
              <pre className={cn("max-h-24 overflow-auto whitespace-pre-wrap break-all rounded bg-black/25 p-2 text-[9px]")}>
                {metaOfferSdpPreview || "—"}
              </pre>
            </div>
            <div>
              <div className="text-white/50">Last answer (browser)</div>
              <pre className={cn("max-h-24 overflow-auto whitespace-pre-wrap break-all rounded bg-black/25 p-2 text-[9px]")}>
                {lastAnswerSdpPreview || "—"}
              </pre>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CollapsibleContent>
    </Collapsible>
  );
}
