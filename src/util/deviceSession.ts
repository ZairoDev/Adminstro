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

