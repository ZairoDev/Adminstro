/** Attendance-facing device kinds (phone browser counts as mobile). */
export const ATTENDANCE_DEVICES = ["desktop", "mobile", "system"] as const;

export type AttendanceDevice = (typeof ATTENDANCE_DEVICES)[number];

/** Phone / tablet browser tokens — not the same as mobile-app session auth. */
const MOBILE_UA_RE =
  /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i;

export function toAttendanceDevice(
  value: string | null | undefined,
): AttendanceDevice {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (normalized === "mobile") return "mobile";
  if (normalized === "system") return "system";
  // "web", "desktop", empty → desktop
  return "desktop";
}

export function isMobileUserAgent(
  userAgent: string | null | undefined,
): boolean {
  return MOBILE_UA_RE.test(String(userAgent || ""));
}

/**
 * Device shown on attendance (desktop | mobile | system).
 * Session auth stays web-vs-app via getDeviceTypeFromHeaders; this only
 * labels the physical device, so a phone browser shows as mobile.
 */
export function getAttendanceDeviceFromHeaders(
  headers: Headers,
  explicit?: "web" | "mobile" | "system" | null,
): AttendanceDevice {
  if (explicit === "system") return "system";
  if (explicit === "mobile") return "mobile";

  const raw = headers.get("x-device-type") || headers.get("X-Device-Type");
  const normalized = String(raw || "").trim().toLowerCase();
  if (normalized === "mobile") return "mobile";
  if (normalized === "system") return "system";

  // Mobile/third-party app convention when Bearer is used without x-device-type: web
  const auth = headers.get("authorization") || headers.get("Authorization");
  if (
    normalized !== "web" &&
    auth &&
    /^Bearer\s+.+$/i.test(auth.trim())
  ) {
    return "mobile";
  }

  if (isMobileUserAgent(headers.get("user-agent"))) return "mobile";
  return "desktop";
}

export function attendanceDeviceLabel(device: AttendanceDevice | null | undefined): string {
  if (device === "mobile") return "Mobile";
  if (device === "system") return "System";
  if (device === "desktop") return "Desktop";
  return "";
}
