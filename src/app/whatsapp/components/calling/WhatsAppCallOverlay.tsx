"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Mic, MicOff, Minimize2, PhoneOff, Volume2, VolumeX, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { OutboundCallPhase, OutboundCallSurface, WebRtcStatsSnapshot } from "@/lib/whatsapp/calling";
import { CallDiagnosticsPanel } from "./CallDiagnosticsPanel";

export type WhatsAppCallOverlayProps = {
  visible: boolean;
  surface: OutboundCallSurface;
  phase: OutboundCallPhase;
  contactLabel: string;
  connectionState: string;
  iceState: string;
  signalingState: string;
  elapsedLabel: string;
  reconnecting: boolean;
  muted: boolean;
  speaker: boolean;
  remoteAudioPlayBlocked: boolean;
  diagnosticsOpen: boolean;
  onDiagnosticsOpenChange: (open: boolean) => void;
  stats: WebRtcStatsSnapshot | null;
  keptCandidates: string[];
  droppedCandidates: { line: string; reason: string }[];
  metaOfferSdpPreview?: string;
  lastAnswerSdpPreview?: string;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
  onHangUp: () => void;
  onResumeAudio: () => void;
  onMinimize: () => void;
  onExpand: () => void;
  /** Business called customer vs customer called business. */
  sessionKind?: "outbound" | "inbound";
};

function phaseLabel(
  phase: OutboundCallPhase,
  reconnecting: boolean,
  sessionKind: "outbound" | "inbound" = "outbound",
): string {
  if (reconnecting) return "Reconnecting…";
  switch (phase) {
    case "initializing":
      return "Starting…";
    case "connecting":
      return sessionKind === "inbound" ? "Connecting to customer…" : "Connecting…";
    case "ringing":
      return sessionKind === "inbound" ? "Joining call…" : "Ringing…";
    case "connected":
      return "On call";
    case "failed":
      return "Call failed";
    case "ended":
      return "Call ended";
    default:
      return phase;
  }
}

function initials(name: string): string {
  const p = name.trim().split(/\s+/).slice(0, 2);
  return p.map((s) => s[0]?.toUpperCase() ?? "").join("") || "?";
}

export function WhatsAppCallOverlay({
  visible,
  surface,
  phase,
  contactLabel,
  connectionState,
  iceState,
  signalingState,
  elapsedLabel,
  reconnecting,
  muted,
  speaker,
  remoteAudioPlayBlocked,
  diagnosticsOpen,
  onDiagnosticsOpenChange,
  stats,
  keptCandidates,
  droppedCandidates,
  metaOfferSdpPreview,
  lastAnswerSdpPreview,
  onToggleMute,
  onToggleSpeaker,
  onHangUp,
  onResumeAudio,
  onMinimize,
  onExpand,
  sessionKind = "outbound",
}: WhatsAppCallOverlayProps) {
  const isFloating = surface === "floating";

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="call-shell"
          initial={{ opacity: 0, y: isFloating ? 12 : 0, scale: isFloating ? 0.96 : 1 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: isFloating ? 16 : 0, scale: isFloating ? 0.95 : 1 }}
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
          className={cn(
            "z-[200] flex flex-col overflow-hidden border border-white/10 shadow-2xl",
            isFloating
              ? "fixed bottom-[max(5.5rem,env(safe-area-inset-bottom,0px))] right-4 w-[min(100vw-2rem,340px)] rounded-2xl"
              : "fixed inset-0 md:inset-4 md:mx-auto md:my-auto md:h-[min(92vh,640px)] md:max-w-lg md:rounded-3xl",
            "bg-gradient-to-b from-[#0b3d2e] via-[#064e3b] to-[#022c22]",
          )}
        >
          <div
            className={cn(
              "pointer-events-none absolute inset-0 opacity-40",
              "bg-[radial-gradient(ellipse_at_top,_rgba(52,211,153,0.35),_transparent_55%)]",
            )}
          />

          <div className="relative z-10 flex flex-1 flex-col px-5 pb-6 pt-8 md:px-8 md:pt-10">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-emerald-100/80">
                  {phaseLabel(phase, reconnecting, sessionKind)}
                </span>
                <span className="font-mono text-[10px] text-white/45">
                  {elapsedLabel} · {connectionState} · {iceState}
                </span>
              </div>
              <div className="flex gap-1">
                {!isFloating ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 shrink-0 text-white/80 hover:bg-white/10 hover:text-white"
                    onClick={onMinimize}
                    aria-label="Minimize call"
                  >
                    <Minimize2 className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-9 shrink-0 text-white/80 hover:bg-white/10 hover:text-white"
                    onClick={onExpand}
                  >
                    Expand
                  </Button>
                )}
              </div>
            </div>

            <div className="mt-8 flex flex-col items-center">
              <motion.div
                animate={
                  phase === "ringing" || phase === "connecting"
                    ? { scale: [1, 1.04, 1] }
                    : reconnecting
                      ? { opacity: [1, 0.7, 1] }
                      : { scale: 1 }
                }
                transition={{ repeat: phase === "ringing" || phase === "connecting" || reconnecting ? Infinity : 0, duration: 1.6 }}
                className="relative"
              >
                <div className="pointer-events-none absolute inset-0 rounded-full bg-emerald-400/25 blur-xl" />
                <Avatar className="relative h-28 w-28 border-4 border-white/15 shadow-lg md:h-32 md:w-32">
                  <AvatarFallback className="bg-emerald-600 text-3xl font-semibold text-white md:text-4xl">
                    {initials(contactLabel)}
                  </AvatarFallback>
                </Avatar>
              </motion.div>
              <h2 className="mt-6 max-w-full truncate text-center text-xl font-semibold text-white md:text-2xl">
                {contactLabel}
              </h2>
              <p className="mt-1 text-center text-sm text-emerald-100/75">
                {phaseLabel(phase, reconnecting, sessionKind)}
              </p>
            </div>

            <div className="mt-auto flex flex-col gap-4 pt-8">
              {remoteAudioPlayBlocked ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={onResumeAudio}
                >
                  Tap to enable call audio
                </Button>
              ) : null}

              <div className="flex items-center justify-center gap-4 md:gap-6">
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className={cn(
                    "h-14 w-14 rounded-full border border-white/10 bg-white/10 text-white hover:bg-white/20",
                    muted && "bg-amber-500/30 text-amber-100",
                  )}
                  onClick={onToggleMute}
                  aria-label={muted ? "Unmute" : "Mute"}
                >
                  {muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="h-16 w-16 rounded-full shadow-lg shadow-red-900/40"
                  onClick={onHangUp}
                  aria-label="End call"
                >
                  <PhoneOff className="h-7 w-7" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className={cn(
                    "h-14 w-14 rounded-full border border-white/10 bg-white/10 text-white hover:bg-white/20",
                    !speaker && "opacity-70",
                  )}
                  onClick={onToggleSpeaker}
                  aria-label="Speaker"
                >
                  {speaker ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />}
                </Button>
              </div>

              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-white/60 hover:bg-white/10 hover:text-white"
                  onClick={() => onDiagnosticsOpenChange(!diagnosticsOpen)}
                >
                  <Bug className="h-4 w-4" />
                  Diagnostics
                </Button>
              </div>

              <CallDiagnosticsPanel
                open={diagnosticsOpen}
                onOpenChange={onDiagnosticsOpenChange}
                stats={stats}
                signalingState={signalingState}
                connectionState={connectionState}
                iceState={iceState}
                keptCandidates={keptCandidates}
                droppedCandidates={droppedCandidates}
                metaOfferSdpPreview={metaOfferSdpPreview}
                lastAnswerSdpPreview={lastAnswerSdpPreview}
              />
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
