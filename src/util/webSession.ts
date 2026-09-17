import Employees from "@/models/employee";
import { endActiveEmployeeLoginSessions } from "@/util/employeeActivitySession";
import {
  WEB_RELEASE_GRACE_MS,
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
