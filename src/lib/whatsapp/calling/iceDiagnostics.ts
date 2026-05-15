/**
 * ICE gathering / connection logging and RTCPeerConnection factory for WhatsApp calls.
 */

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
