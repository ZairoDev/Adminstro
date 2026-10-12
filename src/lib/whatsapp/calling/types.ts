/**
 * Outbound (business-initiated) call UI / session phases.
 * Maps roughly to WhatsApp user-visible states while preserving our signaling flow.
 */
export type OutboundCallPhase =
  | "initializing"
  | "connecting"
  | "ringing"
  | "reconnecting"
  | "connected"
  | "failed"
  | "ended";

export type OutboundCallSurface = "fullscreen" | "floating";

export type OutboundCallUiState = {
  /** Business called customer vs customer called business (UI copy / telemetry). */
  sessionKind?: "outbound" | "inbound";
  phase: OutboundCallPhase;
  surface: OutboundCallSurface;
  contactLabel: string;
  connectionState: string;
  iceState: string;
  signalingState: string;
  startedAtMs: number;
  muted: boolean;
  speaker: boolean;
};

export type WebRtcStatsSnapshot = {
  at: number;
  rttMs?: number;
  jitterMs?: number;
  packetsLost?: number;
  packetsReceived?: number;
  /** Outbound audio RTP */
  packetsSent?: number;
  bytesReceived?: number;
  bytesSent?: number;
  audioLevel?: number;
  localCandidateType?: string;
  remoteCandidateType?: string;
  transport?: string;
};
