/**
 * In-memory rolling rate limit for CRM Copilot turns.
 * Keyed by employeeId. Suitable for single-instance or sticky sessions;
 * replace with Redis if you scale horizontally.
 */

import {
  RATE_LIMIT_MAX_TURNS,
  RATE_LIMIT_WINDOW_MS,
} from "@/services/crm-agent/config";

type Bucket = { timestamps: number[] };

const buckets = new Map<string, Bucket>();

export function checkRateLimit(employeeId: string): {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
} {
  const now = Date.now();
  const bucket = buckets.get(employeeId) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS,
  );

  if (bucket.timestamps.length >= RATE_LIMIT_MAX_TURNS) {
    const oldest = bucket.timestamps[0] ?? now;
    buckets.set(employeeId, bucket);
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(0, RATE_LIMIT_WINDOW_MS - (now - oldest)),
    };
  }

  bucket.timestamps.push(now);
  buckets.set(employeeId, bucket);
  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX_TURNS - bucket.timestamps.length,
    retryAfterMs: 0,
  };
}

/** Test helper */
export function _resetRateLimitsForTests(): void {
  buckets.clear();
}
