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
  relayConfigured: boolean;
  keptCandidates: string[];
  droppedCandidates: { line: string; reason: string }[];
  gatheredCandidates?: { candidate: string; typ: string | null }[];
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
  relayConfigured,
  keptCandidates,
  droppedCandidates,
  gatheredCandidates,
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
              ? "fixed bottom-[max(5.5rem,env(safe-area-inset-bottom,0px))] right-4 w-[min(100vw-2rem,320px)] rounded-xl border border-[#2a3942]"
              : "fixed inset-x-0 bottom-0 max-h-[min(78dvh,400px)] rounded-t-2xl border-t border-[#2a3942] bg-[#0b141a] md:inset-0 md:flex md:max-h-none md:items-center md:justify-center md:rounded-none md:border-0 md:bg-black/60 md:backdrop-blur-sm",
          )}
        >
          <motion.div
            className={cn(
              "flex flex-1 flex-col bg-[#0b141a]",
              !isFloating &&
                "h-full md:mx-auto md:my-auto md:h-[min(68vh,380px)] md:max-w-[360px] md:rounded-xl md:border md:border-[#2a3942]",
              isFloating && "max-h-[min(72dvh,360px)] rounded-xl",
            )}
          >
            <div
              className={cn(
                "pointer-events-none absolute inset-0 opacity-[0.07]",
                "bg-[radial-gradient(ellipse_at_50%_0%,_#25d366,_transparent_50%)]",
                !isFloating && "md:rounded-xl",
              )}
            />

            <div
              className={cn(
                "relative z-10 flex flex-1 flex-col px-5 pb-6",
                isFloating ? "pt-5" : "pt-6 md:px-6 md:pb-7 md:pt-8",
              )}
            >
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

              <motion.div
                className={cn(
                  "flex flex-col items-center",
                  isFloating ? "mt-3" : "mt-5 md:mt-6",
                )}
              >
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
                  <Avatar
                    className={cn(
                      "relative border-2 border-[#2a3942] shadow-lg",
                      isFloating ? "h-20 w-20" : "h-[88px] w-[88px] md:h-24 md:w-24",
                    )}
                  >
                    <AvatarFallback
                      className={cn(
                        "bg-[#25d366] font-normal text-[#0b141a]",
                        isFloating ? "text-2xl" : "text-3xl md:text-[2rem]",
                      )}
                    >
                      {initials(contactLabel)}
                    </AvatarFallback>
                  </Avatar>
                </motion.div>
                <h2
                  className={cn(
                    "max-w-full truncate px-2 text-center font-normal leading-tight text-[#e9edef]",
                    isFloating ? "mt-3 text-lg" : "mt-4 text-xl",
                  )}
                >
                  {contactLabel}
                </h2>
                <p className="mt-1 text-center text-sm text-[#8696a0]">
                  {phaseLabel(phase, reconnecting, sessionKind)}
                </p>
              </motion.div>

              <div className={cn("mt-auto flex flex-col gap-3", isFloating ? "pt-4" : "gap-4 pt-5 md:pt-6")}>
                {remoteAudioPlayBlocked ? (
                  <Button
                    type="button"
                    className="h-11 w-full rounded-lg bg-[#25d366] text-[15px] font-medium text-[#0b141a] hover:bg-[#20bd5a]"
                    onClick={onResumeAudio}
                  >
                    Tap to hear call audio
                  </Button>
                ) : null}

                <div className={cn("flex items-center justify-center", isFloating ? "gap-5" : "gap-6")}>
                  <button
                    type="button"
                    onClick={onToggleMute}
                    aria-label={muted ? "Unmute" : "Mute"}
                    className={cn(
                      "flex items-center justify-center rounded-full bg-[#2a3942] text-[#e9edef] transition-colors hover:bg-[#3b4a54] active:scale-95",
                      isFloating ? "h-11 w-11" : "h-12 w-12",
                      muted && "bg-[#3d3d00] text-[#ffca28]",
                    )}
                  >
                    {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </button>
                  <button
                    type="button"
                    onClick={onHangUp}
                    aria-label="End call"
                    className={cn(
                      "flex items-center justify-center rounded-full bg-[#ea0038] text-white shadow-lg transition-transform hover:bg-[#d70432] active:scale-95",
                      isFloating ? "h-14 w-14" : "h-[3.5rem] w-[3.5rem]",
                    )}
                  >
                    <PhoneOff className={isFloating ? "h-7 w-7" : "h-7 w-7"} />
                  </button>
                  <button
                    type="button"
                    onClick={onToggleSpeaker}
                    aria-label="Speaker"
                    className={cn(
                      "flex items-center justify-center rounded-full bg-[#2a3942] text-[#e9edef] transition-colors hover:bg-[#3b4a54] active:scale-95",
                      isFloating ? "h-11 w-11" : "h-12 w-12",
                      !speaker && "opacity-50",
                    )}
                  >
                    {speaker ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
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
                  relayConfigured={relayConfigured}
                  keptCandidates={keptCandidates}
                  droppedCandidates={droppedCandidates}
                  gatheredCandidates={gatheredCandidates}
                  metaOfferSdpPreview={metaOfferSdpPreview}
                  lastAnswerSdpPreview={lastAnswerSdpPreview}
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
