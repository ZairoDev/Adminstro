export type DeviceType = "web" | "mobile";

export function getDeviceTypeFromHeaders(headers: Headers): DeviceType {
  const raw = headers.get("x-device-type") || headers.get("X-Device-Type");
  const normalized = String(raw || "").trim().toLowerCase();
  if (normalized === "mobile") return "mobile";
  if (normalized === "web") return "web";

  // Backward compatible inference:
  // If the client is using Bearer auth and did not send x-device-type,
  // assume "mobile" (mobile/third-party clients usually don't have cookies).
  const auth = headers.get("authorization") || headers.get("Authorization");
  if (auth && /^Bearer\s+.+$/i.test(auth.trim())) return "mobile";

  // Default to web for browser cookie-based auth.
  return "web";
}

export function sessionPath(deviceType: DeviceType): "webSession" | "mobileSession" {
  return deviceType === "mobile" ? "mobileSession" : "webSession";
}

export const WEB_SESSION_DURATION_MS = 12 * 60 * 60 * 1000;

// --- Web session heartbeat / release tuning ---------------------------------
// Client sends a heartbeat this often while a tab is open.
export const WEB_HEARTBEAT_INTERVAL_MS = 25 * 1000;
// If no heartbeat for this long, the tab is considered gone (safety net for
// crashes / blocked beacons). Long enough that switching apps or checking
// email never looks like a crash — browsers throttle background timers.
export const WEB_SESSION_STALE_MS = 30 * 60 * 1000;
// After a real tab-close beacon, wait this long before freeing the slot
// unless a heartbeat arrives first (refresh / navigation / return from bfcache).
// Generous on purpose: pagehide still fires on some app-switches.
export const WEB_RELEASE_GRACE_MS = 60 * 60 * 1000;

