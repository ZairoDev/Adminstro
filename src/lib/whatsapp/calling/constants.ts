/** Max wait for webhook SDP answer after `start_call` succeeds. */
export const WA_CALL_SIGNALING_ANSWER_TIMEOUT_MS = 45_000;

/** ICE `disconnected` grace before we declare reconnecting / give up client-side UX. */
export const WA_CALL_ICE_DISCONNECTED_GRACE_MS = 12_000;

/** Poll interval for `getStats()` diagnostics. */
export const WA_CALL_STATS_INTERVAL_MS = 1_000;
