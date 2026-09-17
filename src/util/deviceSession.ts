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
// crashes / blocked beacons). Generously larger than the interval so a brief
// network blip never releases a genuinely active session.
export const WEB_SESSION_STALE_MS = 3 * 60 * 1000;
// After the tab-close beacon fires, release the session this long later unless
// a heartbeat arrives first (which happens on refresh/navigation). Short, so a
// real close frees the session quickly.
export const WEB_RELEASE_GRACE_MS = 15 * 1000;

