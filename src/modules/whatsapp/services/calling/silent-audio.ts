/**
 * When the microphone is unavailable, Meta still expects **outbound RTP** on the
 * business leg — silence-only transceivers often send nothing useful and the call
 * can drop after ~20s. This attaches a **near-silent** oscillator-driven track so
 * Opus keeps emitting frames.
 */
export type SilentOutboundAudioHandle = {
  context: AudioContext;
  stream: MediaStream;
  stop: () => void;
};

export function attachSilentOutboundAudioTrack(
  pc: RTCPeerConnection,
): SilentOutboundAudioHandle {
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) {
    throw new Error("AudioContext not supported");
  }
  const context = new AC();
  const dest = context.createMediaStreamDestination();
  const osc = context.createOscillator();
  // 1 Hz is below the threshold of human hearing AND below Opus's DTX detection
  // floor so Opus continues to send Comfort Noise frames rather than going
  // fully silent (which causes Meta's relay to drop the leg after ~20 s).
  osc.type = "sine";
  osc.frequency.value = 1;
  const gain = context.createGain();
  // Amplitude near machine-epsilon — completely inaudible but still non-zero so
  // the AudioWorklet doesn't optimise the node away.
  gain.gain.value = 0.00001;
  osc.connect(gain);
  gain.connect(dest);
  osc.start();

  const [track] = dest.stream.getAudioTracks();
  if (!track) {
    void context.close().catch(() => {});
    throw new Error("Silent audio track missing");
  }
  pc.addTrack(track, dest.stream);

  const stop = () => {
    try {
      osc.stop();
    } catch {
      /* ignore */
    }
    track.stop();
    void context.close().catch(() => {});
  };

  void context.resume().catch(() => {});

  return { context, stream: dest.stream, stop };
}
