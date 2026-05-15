/**
 * ICE gathering / connection logging and RTCPeerConnection factory for WhatsApp calls.
 */

import {
  analyzeRawSdpIce,
  type RawSdpIceSummary,
} from "@/lib/whatsapp/callingSdp";

export type IceGatheredCandidate = {
  candidate: string;
  typ: string | null;
  at: number;
};

const iceGatheredByPc = new WeakMap<RTCPeerConnection, IceGatheredCandidate[]>();

export function getIceGatheredCandidates(pc: RTCPeerConnection): IceGatheredCandidate[] {
  return iceGatheredByPc.get(pc) ?? [];
}

export function resetIceGatheredCandidates(pc: RTCPeerConnection): void {
  iceGatheredByPc.set(pc, []);
}

function parseTypFromCandidateString(candidate: string): string | null {
  const m = candidate.match(/\btyp\s+(\S+)/i);
  return m ? m[1].toLowerCase() : null;
}

/**
 * Create a peer connection for WhatsApp Calling with `iceTransportPolicy: "all"`.
 */
export function createWhatsAppCallPeerConnection(iceServers: RTCIceServer[]): RTCPeerConnection {
  const pc = new RTCPeerConnection({
    iceServers,
    iceTransportPolicy: "all",
    iceCandidatePoolSize: 10,
  });
  resetIceGatheredCandidates(pc);
  attachIceConnectionLogging(pc);
  return pc;
}

/**
 * Log trickle candidates, gathering state, ICE connection state, and selected pair.
 */
export function attachIceConnectionLogging(pc: RTCPeerConnection): void {
  const logPrefix = "[ICE]";

  pc.addEventListener("icegatheringstatechange", () => {
    console.log(`${logPrefix} iceGatheringState=`, pc.iceGatheringState);
  });

  pc.addEventListener("iceconnectionstatechange", () => {
    console.log(`${logPrefix} iceConnectionState=`, pc.iceConnectionState);
    if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
      void logSelectedIceCandidatePair(pc);
    }
  });

  pc.addEventListener("connectionstatechange", () => {
    console.log(`${logPrefix} connectionState=`, pc.connectionState);
  });

  pc.addEventListener("icecandidate", (event: RTCPeerConnectionIceEvent) => {
    if (event.candidate) {
      const line = event.candidate.candidate;
      const typ = parseTypFromCandidateString(line);
      console.log("[RAW ICE]", line);
      console.log(`${logPrefix} Candidate`, line);
      const list = iceGatheredByPc.get(pc) ?? [];
      list.push({ candidate: line, typ, at: Date.now() });
      iceGatheredByPc.set(pc, list);
    } else {
      console.log(`${logPrefix} gathering complete (null candidate)`);
    }
  });
}

/** Log full local SDP + typ counts (before Meta sanitization). */
export function logRawLocalSdpIce(
  pc: RTCPeerConnection,
  label: string,
): RawSdpIceSummary | null {
  const sdp = pc.localDescription?.sdp ?? "";
  if (!sdp.trim()) {
    console.warn(`[RAW LOCAL SDP:${label}] empty — iceGatheringState=${pc.iceGatheringState}`);
    return null;
  }
  console.log(`[RAW LOCAL SDP:${label}]`, sdp);
  const summary = analyzeRawSdpIce(sdp);
  console.log(`[RAW LOCAL SDP:${label}] summary`, {
    ...summary,
    iceGatheringState: pc.iceGatheringState,
  });
  return summary;
}

const ICE_GATHER_BASE_MS = 20_000;
const ICE_GATHER_TURN_MS = 30_000;
const ICE_GATHER_EXTRA_MS = 12_000;

/**
 * Wait for ICE gathering; when TURN is configured, wait longer and optionally restart ICE
 * if raw SDP still has no srflx/relay.
 */
export async function awaitIceGatheringForMeta(
  pc: RTCPeerConnection,
  relayConfigured: boolean,
  awaitGather: (pc: RTCPeerConnection, timeoutMs: number) => Promise<void>,
): Promise<RawSdpIceSummary | null> {
  const primaryMs = relayConfigured ? ICE_GATHER_TURN_MS : ICE_GATHER_BASE_MS;
  await awaitGather(pc, primaryMs);
  let summary = logRawLocalSdpIce(pc, "gather-pass-1");

  if (relayConfigured && summary && !summary.hasSrflx && !summary.hasRelay) {
    console.warn(
      "[ice] TURN configured but raw SDP has no srflx/relay after first gather — extra wait + restartIce",
    );
    await awaitGather(pc, ICE_GATHER_EXTRA_MS);
    summary = logRawLocalSdpIce(pc, "gather-pass-2");
    if (summary && !summary.hasSrflx && !summary.hasRelay) {
      try {
        pc.restartIce();
        await awaitGather(pc, ICE_GATHER_EXTRA_MS);
        summary = logRawLocalSdpIce(pc, "gather-after-restartIce");
      } catch (err) {
        console.warn("[ice] restartIce failed:", err);
      }
    }
  }

  return summary;
}

export async function logSelectedIceCandidatePair(pc: RTCPeerConnection): Promise<void> {
  try {
    const stats = await pc.getStats();
    stats.forEach((report) => {
      if (report.type !== "candidate-pair") return;
      const pair = report as RTCStats & {
        state?: string;
        localCandidateId?: string;
        remoteCandidateId?: string;
        currentRoundTripTime?: number;
      };
      if (pair.state !== "succeeded") return;

      let localTyp: string | undefined;
      let remoteTyp: string | undefined;
      let localProtocol: string | undefined;

      stats.forEach((r) => {
        if (r.id === pair.localCandidateId && r.type === "local-candidate") {
          const lc = r as RTCStats & { candidateType?: string; protocol?: string };
          localTyp = lc.candidateType;
          localProtocol = lc.protocol;
        }
        if (r.id === pair.remoteCandidateId && r.type === "remote-candidate") {
          const rc = r as RTCStats & { candidateType?: string };
          remoteTyp = rc.candidateType;
        }
      });

      console.log("[ICE] selected candidate-pair", {
        currentRoundTripTime: pair.currentRoundTripTime,
        localCandidateType: localTyp,
        localProtocol,
        remoteCandidateType: remoteTyp,
      });
    });
  } catch (err) {
    console.warn("[ICE] getStats for selected pair failed:", err);
  }
}
