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
      return sessionKind === "inbound" ? "Connecting…" : "Calling…";
    case "ringing":
      return sessionKind === "inbound" ? "Ringing" : "Ringing…";
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
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          className={cn(
            "z-[200] flex flex-col overflow-hidden shadow-2xl",
            isFloating
              ? "fixed bottom-[max(5.5rem,env(safe-area-inset-bottom,0px))] right-4 w-[min(100vw-2rem,340px)] rounded-xl border border-[#2a3942]"
              : "fixed inset-0 bg-[#0b141a] md:inset-0 md:flex md:items-center md:justify-center md:bg-black/60 md:backdrop-blur-sm",
          )}
        >
          {/* Fullscreen: WhatsApp-style dark panel */}
          <div
            className={cn(
              "flex flex-1 flex-col bg-[#0b141a]",
              !isFloating && "md:mx-auto md:my-auto md:h-[min(92vh,520px)] md:max-w-[400px] md:rounded-xl md:border md:border-[#2a3942]",
              isFloating && "rounded-xl",
            )}
          >
            <div
              className={cn(
                "pointer-events-none absolute inset-0 opacity-[0.07]",
                "bg-[radial-gradient(ellipse_at_50%_0%,_#25d366,_transparent_50%)]",
                !isFloating && "md:rounded-xl",
              )}
            />

            <div className="relative z-10 flex flex-1 flex-col px-5 pb-8 pt-10 md:px-7 md:pt-12">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[13px] font-medium text-[#8696a0]">
                    {phaseLabel(phase, reconnecting, sessionKind)}
                  </span>
                  <span className="truncate font-mono text-[11px] text-[#667781]">
                    {elapsedLabel}
                    {(phase === "connected" || phase === "reconnecting") && (
                      <> · {reconnecting ? "ICE reconnect" : connectionState}</>
                    )}
                  </span>
                </div>
                <div className="flex shrink-0 gap-1">
                  {!isFloating ? (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-10 w-10 text-[#aebac1] hover:bg-[#2a3942] hover:text-white"
                      onClick={onMinimize}
                      aria-label="Minimize call"
                    >
                      <Minimize2 className="h-5 w-5" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-9 shrink-0 text-[#aebac1] hover:bg-[#2a3942] hover:text-white"
                      onClick={onExpand}
                    >
                      Expand
                    </Button>
                  )}
                </div>
              </div>

              <div className="mt-10 flex flex-col items-center md:mt-14">
                <motion.div
                  animate={
                    phase === "ringing" || phase === "connecting"
                      ? { scale: [1, 1.03, 1] }
                      : reconnecting
                        ? { opacity: [1, 0.75, 1] }
                        : { scale: 1 }
                  }
                  transition={{
                    repeat: phase === "ringing" || phase === "connecting" || reconnecting ? Infinity : 0,
                    duration: 1.8,
                  }}
                  className="relative"
                >
                  <div className="pointer-events-none absolute inset-0 rounded-full bg-[#25d366]/20 blur-2xl" />
                  <Avatar className="relative h-[120px] w-[120px] border-2 border-[#2a3942] shadow-lg md:h-[132px] md:w-[132px]">
                    <AvatarFallback className="bg-[#25d366] text-4xl font-normal text-[#0b141a] md:text-[2.75rem]">
                      {initials(contactLabel)}
                    </AvatarFallback>
                  </Avatar>
                </motion.div>
                <h2 className="mt-7 max-w-full truncate px-2 text-center text-[22px] font-normal leading-tight text-[#e9edef] md:text-2xl">
                  {contactLabel}
                </h2>
                <p className="mt-2 text-center text-[15px] text-[#8696a0]">
                  {phaseLabel(phase, reconnecting, sessionKind)}
                </p>
              </div>

              <div className="mt-auto flex flex-col gap-5 pt-10">
                {remoteAudioPlayBlocked ? (
                  <Button
                    type="button"
                    className="h-11 w-full rounded-lg bg-[#25d366] text-[15px] font-medium text-[#0b141a] hover:bg-[#20bd5a]"
                    onClick={onResumeAudio}
                  >
                    Tap to hear call audio
                  </Button>
                ) : null}

                <div className="flex items-center justify-center gap-6 md:gap-8">
                  <button
                    type="button"
                    onClick={onToggleMute}
                    aria-label={muted ? "Unmute" : "Mute"}
                    className={cn(
                      "flex h-14 w-14 items-center justify-center rounded-full bg-[#2a3942] text-[#e9edef] transition-colors hover:bg-[#3b4a54] active:scale-95",
                      muted && "bg-[#3d3d00] text-[#ffca28]",
                    )}
                  >
                    {muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                  </button>
                  <button
                    type="button"
                    onClick={onHangUp}
                    aria-label="End call"
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-[#ea0038] text-white shadow-lg transition-transform hover:bg-[#d70432] active:scale-95"
                  >
                    <PhoneOff className="h-8 w-8" />
                  </button>
                  <button
                    type="button"
                    onClick={onToggleSpeaker}
                    aria-label="Speaker"
                    className={cn(
                      "flex h-14 w-14 items-center justify-center rounded-full bg-[#2a3942] text-[#e9edef] transition-colors hover:bg-[#3b4a54] active:scale-95",
                      !speaker && "opacity-50",
                    )}
                  >
                    {speaker ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />}
                  </button>
                </div>

                <div className="flex justify-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-[#667781] hover:bg-[#2a3942] hover:text-[#aebac1]"
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
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
