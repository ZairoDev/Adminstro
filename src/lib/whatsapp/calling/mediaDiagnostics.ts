/**
 * RTP / media-path diagnostics (not SDP). Use in dev or when investigating Meta ~20s drops.
 */

export type OutboundRtpAudioSummary = {
  packetsSent?: number;
  bytesSent?: number;
  timestamp?: number;
  active?: boolean;
};

export async function collectOutboundRtpAudioSummary(pc: RTCPeerConnection): Promise<OutboundRtpAudioSummary> {
  const report = await pc.getStats();
  let best: OutboundRtpAudioSummary = {};
  report.forEach((r) => {
    if (r.type !== "outbound-rtp") return;
    const k = (r as { kind?: string }).kind;
    if (k !== "audio") return;
    const row = r as unknown as { packetsSent?: number; bytesSent?: number; timestamp?: number };
    best = {
      packetsSent: row.packetsSent,
      bytesSent: row.bytesSent,
      timestamp: row.timestamp,
      active: typeof row.packetsSent === "number" && row.packetsSent > 0,
    };
  });
  return best;
}

/**
 * Logs outbound-rtp (audio), inbound-rtp (audio), succeeded candidate-pair, and sender state.
 */
export function logWebRtcMediaDiagnostics(pc: RTCPeerConnection, label: string): void {
  const prefix = `[call-media:${label}]`;

  void pc.getStats().then((stats) => {
    stats.forEach((report) => {
      if (report.type === "outbound-rtp" && (report as { kind?: string }).kind === "audio") {
        const r = report as unknown as {
          packetsSent?: number;
          bytesSent?: number;
          packetsLost?: number;
          roundTripTime?: number;
        };
        console.info(prefix, "outbound-rtp audio", {
          packetsSent: r.packetsSent,
          bytesSent: r.bytesSent,
          packetsLost: r.packetsLost,
          roundTripTime: r.roundTripTime,
        });
      }
      if (report.type === "inbound-rtp" && (report as { kind?: string }).kind === "audio") {
        const r = report as unknown as { packetsReceived?: number; bytesReceived?: number; jitter?: number };
        console.info(prefix, "inbound-rtp audio", {
          packetsReceived: r.packetsReceived,
          bytesReceived: r.bytesReceived,
          jitter: r.jitter,
        });
      }
      if (report.type === "candidate-pair" && (report as { state?: string }).state === "succeeded") {
        const r = report as unknown as {
          currentRoundTripTime?: number;
          availableOutgoingBitrate?: number;
        };
        console.info(prefix, "candidate-pair succeeded", {
          currentRoundTripTime: r.currentRoundTripTime,
          availableOutgoingBitrate: r.availableOutgoingBitrate,
        });
      }
    });

    for (const sender of pc.getSenders()) {
      const t = sender.track;
      if (!t || t.kind !== "audio") continue;
      const tr = sender.transport;
      console.info(prefix, "sender audio", {
        readyState: t.readyState,
        enabled: t.enabled,
        muted: t.muted,
        dtlsTransportState: tr?.state,
        iceTransportState: tr?.iceTransport?.state,
      });
    }

    console.info(prefix, "pc", {
      connectionState: pc.connectionState,
      iceConnectionState: pc.iceConnectionState,
      signalingState: pc.signalingState,
    });
  });
}
