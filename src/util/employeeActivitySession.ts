import EmployeeActivityLog from "@/models/employeeActivityLog";
// NOTE: getIpLocation (and, for consistency, getClientIp) are imported
// dynamically inside logEmployeeLoginActivity below instead of statically
// here. getIpLocation pulls in `geoip-lite`, which reads a large binary
// data file via `fs` at require-time. A static top-level import of that
// chain breaks Next's dev route bundler for every file that (transitively)
// imports this module — routes compile but resolve to a 404. Keep this
// as a dynamic import.

type EndSessionsOptions = {
  employeeId: string;
  logoutTime: Date;
  sessionId?: string | null;
};

/** Mark active login activity logs as ended (optionally scoped to one session). */
export async function endActiveEmployeeLoginSessions({
  employeeId,
  logoutTime,
  sessionId,
}: EndSessionsOptions): Promise<number> {
  const baseQuery = {
    employeeId: String(employeeId),
    status: "active",
    activityType: "login" as const,
  };

  const sessions = await EmployeeActivityLog.find(
    sessionId ? { ...baseQuery, sessionId } : baseQuery,
  );

  if (sessions.length === 0) return 0;

  await Promise.all(
    sessions.map((session) => {
      const loginTime = session.loginTime ? new Date(session.loginTime) : null;
      const durationMinutes = loginTime
        ? Math.max(
            0,
            Math.round((logoutTime.getTime() - loginTime.getTime()) / (1000 * 60)),
          )
        : 0;
      session.logoutTime = logoutTime;
      session.duration = durationMinutes;
      session.status = "ended";
      session.lastActivityAt = logoutTime;
      return session.save().catch(() => undefined);
    }),
  );

  return sessions.length;
}

type LogLoginActivityOptions = {
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  role: string;
  sessionId: string;
  headers: Headers;
  notes?: string;
};

/** Build a human-readable "City, Region, Country" string from geoip-lite output. */
function formatGeoLocation(geo: {
  country?: string;
  region?: string;
  city?: string;
}): string {
  const parts = [geo.city, geo.region, geo.country].filter(
    (part): part is string => Boolean(part) && part !== "Unknown",
  );
  return parts.join(", ");
}

/**
 * Create a "login" activity log entry (best-effort, never throws).
 * Shared by every login path (employeelogin, verify-otp) so the IP/location
 * resolution logic — and the record shape — stay consistent everywhere.
 */
export async function logEmployeeLoginActivity({
  employeeId,
  employeeName,
  employeeEmail,
  role,
  sessionId,
  headers,
  notes = "Login through employee portal",
}: LogLoginActivityOptions): Promise<void> {
  try {
    const { getClientIpFromHeaders } = await import("@/util/getClientIp");

    const ipAddress =
      getClientIpFromHeaders(headers) ||
      headers.get("x-forwarded-for")?.split(",")[0] ||
      headers.get("x-real-ip") ||
      "Unknown";
    const userAgent = headers.get("user-agent") || "";

    // Geo lookup is a best-effort enrichment ONLY. geoip-lite reads binary
    // data files that may be unavailable in a bundled server, so it must
    // never be able to prevent the actual login record from being saved.
    let location = "";
    try {
      const { getIpLocation } = await import("@/util/getIpLocation");
      location = formatGeoLocation(getIpLocation(ipAddress));
    } catch (geoErr) {
      console.warn(
        "Geo lookup failed (non-critical):",
        geoErr instanceof Error ? geoErr.message : geoErr,
      );
    }

    const activityLog = new EmployeeActivityLog({
      employeeId,
      employeeName,
      employeeEmail,
      role,
      activityType: "login",
      loginTime: new Date(),
      sessionId,
      status: "active",
      lastActivityAt: new Date(),
      ipAddress,
      location,
      userAgent,
      notes,
    });

    await activityLog.save();
  } catch (err) {
    console.warn(
      "Failed to log login activity:",
      err instanceof Error ? err.message : err,
    );
  }
}

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

/** IST calendar-day bounds as UTC Dates (Asia/Kolkata, UTC+5:30). */
export function getIstDayBounds(now: Date = new Date()): {
  start: Date;
  end: Date;
} {
  const istMs = now.getTime() + IST_OFFSET_MS;
  const istDate = new Date(istMs);
  const startUtcMs =
    Date.UTC(
      istDate.getUTCFullYear(),
      istDate.getUTCMonth(),
      istDate.getUTCDate(),
      0,
      0,
      0,
      0,
    ) - IST_OFFSET_MS;

  return {
    start: new Date(startUtcMs),
    end: new Date(startUtcMs + 24 * 60 * 60 * 1000),
  };
}

/**
 * Count login activity rows for an employee since IST midnight.
 * Includes the current login when called after logEmployeeLoginActivity.
 */
export async function countEmployeeLoginsToday(
  employeeId: string,
  now: Date = new Date(),
): Promise<number> {
  const { start, end } = getIstDayBounds(now);

  return EmployeeActivityLog.countDocuments({
    employeeId: String(employeeId),
    activityType: "login",
    $or: [
      { loginTime: { $gte: start, $lt: end } },
      {
        $and: [
          {
            $or: [{ loginTime: null }, { loginTime: { $exists: false } }],
          },
          { createdAt: { $gte: start, $lt: end } },
        ],
      },
    ],
  });
}
