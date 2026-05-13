/**
 * Mic capture constraints tuned for VoIP (WhatsApp / Opus).
 * - echoCancellation + noiseSuppression eliminate the most common sources of
 *   artifacts (room echo, keyboard clicks, background hiss).
 * - autoGainControl keeps the talker audible without peaking.
 * - Mono at 48 kHz matches Opus's native operating rate and halves bandwidth.
 * - latency hint (10 ms) minimises buffering in the capture chain.
 */
export function getOutboundCallAudioConstraints(): MediaTrackConstraints {
  return {
    echoCancellation: { ideal: true },
    noiseSuppression: { ideal: true },
    autoGainControl: { ideal: true },
    channelCount: { ideal: 1 },
    sampleRate: { ideal: 48_000 },
    // @ts-expect-error latency is not in the standard TS types yet
    latency: { ideal: 0.01 },
  };
}
