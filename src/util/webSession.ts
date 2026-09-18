import Employees from "@/models/employee";
import { endActiveEmployeeLoginSessions } from "@/util/employeeActivitySession";
import {
  WEB_RELEASE_GRACE_MS,
  WEB_SESSION_DURATION_MS,
  WEB_SESSION_STALE_MS,
} from "@/util/deviceSession";

export type WebSessionSlot = {
  sessionId?: string | null;
  sessionStartedAt?: number | null;
  expiresAt?: number | null;
  isLoggedIn?: boolean;
  lastActiveAt?: number | null;
  pendingReleaseAt?: number | null;
};

/**
 * Whether a web session is genuinely still alive — i.e. it should BLOCK a new
 * login. A session is alive only if it is logged in, not past its absolute 12h
 * window, not pending-release beyond the grace period, and its heartbeat is
 * still fresh.
 *
 * Legacy sessions created before heartbeats existed have no `lastActiveAt`; they
 * are treated as alive until their absolute `expiresAt` so we never wrongly free
 * a real in-use session during the transition.
 */
export function isWebSessionAlive(
  slot: WebSessionSlot | null | undefined,
  now: number = Date.now(),
): boolean {
  if (!slot?.isLoggedIn) return false;
  if (!slot?.sessionId) return false;

  // Absolute 12h expiry.
  if (
    typeof slot.expiresAt === "number" &&
    slot.expiresAt > 0 &&
    now > slot.expiresAt
  ) {
    return false;
  }

  // Tab-close beacon fired and no heartbeat cleared it within the grace window.
  if (
    typeof slot.pendingReleaseAt === "number" &&
    slot.pendingReleaseAt > 0 &&
    now - slot.pendingReleaseAt > WEB_RELEASE_GRACE_MS
  ) {
    return false;
  }

  // Heartbeat stopped (tab closed / crashed) beyond the stale window.
  if (
    typeof slot.lastActiveAt === "number" &&
    slot.lastActiveAt > 0 &&
    now - slot.lastActiveAt > WEB_SESSION_STALE_MS
  ) {
    return false;
  }

  return true;
}

/**
 * Release a web session slot on the employee document and close out its
 * matching login-activity row (records the logout). Best-effort; never throws.
 */
export async function freeWebSession(
  employeeId: string,
  sessionId?: string | null,
): Promise<void> {
  if (!employeeId || employeeId === "test-superadmin") return;

  await Employees.updateOne(
    {
      _id: employeeId,
      ...(sessionId ? { "webSession.sessionId": sessionId } : {}),
    },
    {
      $set: {
        "webSession.sessionId": null,
        "webSession.sessionStartedAt": null,
        "webSession.expiresAt": null,
        "webSession.isLoggedIn": false,
        "webSession.lastActiveAt": null,
        "webSession.pendingReleaseAt": null,
        lastLogout: new Date(),
      },
    },
  ).catch(() => undefined);

  try {
    await endActiveEmployeeLoginSessions({
      employeeId: String(employeeId),
      logoutTime: new Date(),
      sessionId: sessionId ?? null,
    });
  } catch {
    // non-critical
  }
}

export type RestoreWebSessionResult = "restored" | "occupied" | "expired";

/**
 * Put a still-valid web JWT back into a vacant slot.
 *
 * The sweeper frees slots without bumping `webTokenValidAfter`. Force-logout,
 * PIP lock, and password rotation DO bump it, so those tokens never reach here.
 * A different live web session is left alone (occupied) so we never steal it.
 */
export async function restoreWebSessionIfSwept(params: {
  employeeId: string;
  sessionId: string;
  issuedAtMs?: number;
}): Promise<RestoreWebSessionResult> {
  const { employeeId, sessionId, issuedAtMs } = params;
  if (!employeeId || !sessionId || employeeId === "test-superadmin") {
    return "occupied";
  }

  const now = Date.now();
  const sessionStartedAt =
    typeof issuedAtMs === "number" && issuedAtMs > 0 ? issuedAtMs : now;
  const expiresAt = sessionStartedAt + WEB_SESSION_DURATION_MS;
  if (now > expiresAt) {
    return "expired";
  }

  const result = await Employees.updateOne(
    {
      _id: employeeId,
      $or: [
        { "webSession.isLoggedIn": { $ne: true } },
        { "webSession.sessionId": { $in: [null, sessionId] } },
      ],
    },
    {
      $set: {
        "webSession.sessionId": sessionId,
        "webSession.sessionStartedAt": sessionStartedAt,
        "webSession.expiresAt": expiresAt,
        "webSession.isLoggedIn": true,
        "webSession.lastActiveAt": now,
        "webSession.pendingReleaseAt": null,
      },
    },
  );

  return result.matchedCount > 0 ? "restored" : "occupied";
}
