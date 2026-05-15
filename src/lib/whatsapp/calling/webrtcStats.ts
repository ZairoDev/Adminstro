import type { WebRtcStatsSnapshot } from "./types";

/**
 * Best-effort aggregation from `RTCPeerConnection.getStats()` (browser-specific).
 */
export async function collectWebRtcStats(pc: RTCPeerConnection): Promise<WebRtcStatsSnapshot> {
  const at = Date.now();
  const snap: WebRtcStatsSnapshot = { at };

  let inbound: RTCStatsReport | undefined;
  try {
    inbound = await pc.getStats();
  } catch {
    return snap;
  }

  let candidatePair: RTCStats | undefined;
  const remoteInboundForAudio: RTCStats[] = [];
  const localCandidates = new Map<string, RTCStats>();
  const remoteCandidates = new Map<string, RTCStats>();

  inbound.forEach((report) => {
    if (report.type === "local-candidate") {
      localCandidates.set(report.id, report);
    }
    if (report.type === "remote-candidate") {
      remoteCandidates.set(report.id, report);
    }
    if (report.type === "candidate-pair" && "state" in report && (report as RTCStats & { state?: string }).state === "succeeded") {
      candidatePair = report;
    }
    if (report.type === "remote-inbound-rtp" && (report as { kind?: string }).kind === "audio") {
      remoteInboundForAudio.push(report);
    }
    if (report.type === "inbound-rtp" && (report as { kind?: string }).kind === "audio") {
      const r = report as unknown as {
        jitter?: number;
        packetsLost?: number;
        packetsReceived?: number;
        bytesReceived?: number;
        audioLevel?: number;
      };
      if (typeof r.jitter === "number") snap.jitterMs = r.jitter * 1000;
      if (typeof r.packetsLost === "number") snap.packetsLost = r.packetsLost;
      if (typeof r.packetsReceived === "number") snap.packetsReceived = r.packetsReceived;
      if (typeof r.bytesReceived === "number") snap.bytesReceived = r.bytesReceived;
      if (typeof r.audioLevel === "number") snap.audioLevel = r.audioLevel;
    }
    if (report.type === "outbound-rtp" && (report as { kind?: string }).kind === "audio") {
      const r = report as unknown as { bytesSent?: number; packetsSent?: number };
      if (typeof r.bytesSent === "number") snap.bytesSent = r.bytesSent;
      if (typeof r.packetsSent === "number") snap.packetsSent = r.packetsSent;
    }
  });

  if (candidatePair && "currentRoundTripTime" in candidatePair) {
    const pair = candidatePair as {
      currentRoundTripTime?: number;
      localCandidateId?: string;
      remoteCandidateId?: string;
    };
    const rtt = pair.currentRoundTripTime;
    if (typeof rtt === "number" && rtt > 0) snap.rttMs = rtt * 1000;

    const local = pair.localCandidateId ? localCandidates.get(pair.localCandidateId) : undefined;
    const remote = pair.remoteCandidateId ? remoteCandidates.get(pair.remoteCandidateId) : undefined;
    if (local && "candidateType" in local) {
      snap.localCandidateType = String((local as { candidateType?: string }).candidateType ?? "");
    }
    if (remote && "candidateType" in remote) {
      snap.remoteCandidateType = String((remote as { candidateType?: string }).candidateType ?? "");
    }
    if (local && "protocol" in local) {
      snap.transport = String((local as { protocol?: string }).protocol ?? "");
    }
  }

  const firstRemote = remoteInboundForAudio[0] as unknown as {
    roundTripTime?: number;
    jitter?: number;
    packetsLost?: number;
  };
  if (snap.rttMs == null && typeof firstRemote?.roundTripTime === "number") {
    snap.rttMs = firstRemote.roundTripTime * 1000;
  }
  if (snap.jitterMs == null && typeof firstRemote?.jitter === "number") {
    snap.jitterMs = firstRemote.jitter * 1000;
  }
  if (snap.packetsLost == null && typeof firstRemote?.packetsLost === "number") {
    snap.packetsLost = firstRemote.packetsLost;
  }

  return snap;
}
