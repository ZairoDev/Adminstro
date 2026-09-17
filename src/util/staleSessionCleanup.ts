import cron from "node-cron";

import Employees from "@/models/employee";
import EmployeeActivityLog from "@/models/employeeActivityLog";
import { connectDb } from "@/util/db";
import { endActiveEmployeeLoginSessions } from "@/util/employeeActivitySession";
import { freeWebSession, isWebSessionAlive, type WebSessionSlot } from "@/util/webSession";

// Tolerate a few minutes of clock drift / in-flight heartbeats before
// treating an expired-but-recent session as stale.
const CLEANUP_GRACE_MS = 5 * 60 * 1000;

// Legacy rows created before `sessionId` existed can't be correlated to an
// Employee session slot at all — fall back to a hard age cap so they don't
// linger as "active" forever either.
const MAX_UNTRACKED_SESSION_AGE_MS = 24 * 60 * 60 * 1000;

type EmployeeSessionSlot = {
  sessionId?: string | null;
  isLoggedIn?: boolean;
  expiresAt?: number | null;
};

type EmployeeSessionDoc = {
  _id: unknown;
  webSession?: EmployeeSessionSlot | null;
  mobileSession?: EmployeeSessionSlot | null;
};

/**
 * Returns true if the given sessionId is still the employee's genuinely
 * live session (i.e. matches the current web/mobile slot, is marked
 * logged in, and — for web — has not passed its 12h expiry).
 */
function isSessionStillLive(
  employee: EmployeeSessionDoc | undefined,
  sessionId: string,
): boolean {
  if (!employee) return false;

  const web = employee.webSession;
  if (web?.sessionId === sessionId && web?.isLoggedIn === true) {
    const expiresAt = web?.expiresAt;
    const expired =
      typeof expiresAt === "number" &&
      expiresAt > 0 &&
      Date.now() > expiresAt + CLEANUP_GRACE_MS;
    return !expired;
  }

  const mobile = employee.mobileSession;
  if (mobile?.sessionId === sessionId && mobile?.isLoggedIn === true) {
    // Mobile sessions are permanent by design (no auto-expiry) — only an
    // explicit logout / force-logout / new login ends them.
    return true;
  }

  return false;
}

/**
 * Closes out `EmployeeActivityLog` rows left "active" because the browser
 * (or app) was closed, lost connectivity, or crashed before a logout
 * request — or any other authenticated request — could reach the server.
 *
 * This is the safety net for the gap that per-request cleanup (in
 * getDataFromToken) can't cover: if nobody ever calls the API again for
 * that session, nothing naturally triggers cleanup and the login-activity
 * dashboard shows it as "active"/live indefinitely.
 */
export async function cleanupStaleEmployeeActivitySessions(): Promise<number> {
  await connectDb();

  const activeSessions = await EmployeeActivityLog.find({
    status: "active",
    activityType: "login",
  })
    .select("employeeId sessionId loginTime")
    .lean<{ employeeId: string; sessionId?: string | null; loginTime?: Date | null }[]>();

  if (activeSessions.length === 0) return 0;

  const employeeIds = Array.from(
    new Set(activeSessions.map((s) => String(s.employeeId))),
  );
  const employees = await Employees.find({ _id: { $in: employeeIds } })
    .select("webSession mobileSession")
    .lean<EmployeeSessionDoc[]>();
  const employeeById = new Map(employees.map((e) => [String(e._id), e]));

  let closedCount = 0;
  const now = Date.now();

  for (const session of activeSessions) {
    const employeeId = String(session.employeeId);
    const sessionId = session.sessionId || null;

    let isStale: boolean;
    if (sessionId) {
      isStale = !isSessionStillLive(employeeById.get(employeeId), sessionId);
    } else {
      const loginTimeMs = session.loginTime
        ? new Date(session.loginTime).getTime()
        : null;
      isStale =
        typeof loginTimeMs === "number" &&
        now - loginTimeMs > MAX_UNTRACKED_SESSION_AGE_MS;
    }

    if (!isStale) continue;

    try {
      const ended = await endActiveEmployeeLoginSessions({
        employeeId,
        logoutTime: new Date(),
        sessionId,
      });
      closedCount += ended;
    } catch (err) {
      console.warn(
        `[session-cleanup] Failed to close stale session for ${employeeId}:`,
        err,
      );
    }
  }

  if (closedCount > 0) {
    console.log(
      `🧹 [session-cleanup] Closed ${closedCount} stale login-activity session(s).`,
    );
  }

  return closedCount;
}

/**
 * Fast sweeper for dead WEB SESSION SLOTS on the Employee document.
 *
 * Complements `cleanupStaleEmployeeActivitySessions` (which closes activity-log
 * rows on a 15-min cron): this runs every ~30s so a closed tab is reflected
 * quickly — it frees the `webSession` slot (so the online/monitoring list and
 * "already logged in" check update promptly) and records the logout.
 *
 * A session is only freed when it is NOT alive per `isWebSessionAlive`, i.e. the
 * tab-close beacon fired (past the grace window) or the heartbeat went stale —
 * never a genuinely active session.
 */
export async function cleanupDeadWebSessions(): Promise<number> {
  await connectDb();

  const now = Date.now();
  const candidates = await Employees.find({ "webSession.isLoggedIn": true })
    .select("webSession email")
    .lean<{ _id: unknown; email?: string; webSession?: WebSessionSlot | null }[]>();

  if (candidates.length === 0) return 0;

  let freed = 0;
  const io = (global as unknown as {
    io?: { emit: (event: string, data: object) => void };
  }).io;

  for (const emp of candidates) {
    const slot = emp.webSession;
    if (isWebSessionAlive(slot, now)) continue;

    try {
      await freeWebSession(String(emp._id), slot?.sessionId ?? null);
      freed += 1;
      if (io) {
        io.emit("employee-logout", { _id: String(emp._id), email: emp.email });
      }
    } catch (err) {
      console.warn(
        `[web-session-sweeper] Failed to release web session for ${String(emp._id)}:`,
        err,
      );
    }
  }

  if (freed > 0) {
    console.log(`🧹 [web-session-sweeper] Released ${freed} dead web session(s).`);
  }

  return freed;
}

const DEFAULT_WEB_SWEEP_MS = 30 * 1000;

/**
 * Starts the fast web-session sweeper. Uses setInterval (not cron) because the
 * cadence is sub-minute.
 */
export const startWebSessionSweeper = (): void => {
  const intervalMs =
    Number(process.env.WEB_SESSION_SWEEP_MS) || DEFAULT_WEB_SWEEP_MS;

  setInterval(() => {
    cleanupDeadWebSessions().catch((err) => {
      console.warn("[web-session-sweeper] Scheduled run failed:", err);
    });
  }, intervalMs);

  console.log("🧹 Web session sweeper started | interval(ms):", intervalMs);
};

const DEFAULT_CRON_EVERY_15_MIN = "*/15 * * * *";

export const startStaleSessionCleanupScheduler = (): void => {
  const expression =
    process.env.SESSION_CLEANUP_CRON ?? DEFAULT_CRON_EVERY_15_MIN;

  cron.schedule(
    expression,
    async () => {
      try {
        await cleanupStaleEmployeeActivitySessions();
      } catch (err) {
        console.warn("[session-cleanup] Scheduled run failed:", err);
      }
    },
    { timezone: "Asia/Kolkata" },
  );

  console.log(
    "🧹 Stale session cleanup scheduler started | cron:",
    expression,
    "| timezone: Asia/Kolkata",
  );
};
