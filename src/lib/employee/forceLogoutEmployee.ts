import Employees from "@/models/employee";
import EmployeeActivityLog from "@/models/employeeActivityLog";
import { generateMobilePin } from "@/util/generateMobilePin";
import { generatePassword } from "@/util/generatePassword";
import { computePasswordExpiryDate } from "@/util/passwordExpiry";

export interface ForceLogoutEmployeeOptions {
  actorName: string;
  actorRole: string;
  sessionId?: string;
  reason?: string;
  /** Optional message shown as a toast by SocketGlobalListener before the client redirects to /login. */
  message?: string;
  /** Extra context appended to the EmployeeActivityLog note. */
  notes?: string;
  /** Preserve the employee's credentials when only session revocation is needed.
   * Defaults to true to preserve the existing admin force-logout behavior. */
  rotateCredentials?: boolean;
  /** Skip the session DB update when the caller revoked sessions atomically
   * with another state transition (for example, issuing a PIP). */
  sessionsAlreadyRevoked?: boolean;
}
export interface ForceLogoutEmployeeResult {
  success: boolean;
  message: string;
}
/**
 * Kills an employee's active web/mobile sessions, optionally rotates their password
 * and mobile PIN, writes an activity-log entry, and emits a realtime `force-logout`
 * socket event so any open client is kicked out immediately.
 *
 * Shared by:
 * - POST /api/employee/forceLogout (HR-initiated manual force logout)
 * - POST /api/employee/pip (issuing a PIP locks the profile and force-logs-out the employee)
 */
export async function forceLogoutEmployee(
  employeeId: string,
  options: ForceLogoutEmployeeOptions,
): Promise<ForceLogoutEmployeeResult> {
  const {
    actorName,
    actorRole,
    sessionId,
    reason,
    message,
    notes,
    rotateCredentials = true,
    sessionsAlreadyRevoked = false,
  } = options;
  const employee = await Employees.findById(employeeId);
  if (!employee) {
    return { success: false, message: "Employee not found" };
  }
  const targetRole = String(employee.role || "").trim().toLowerCase();
  if (targetRole === "superadmin") {
    return { success: false, message: "SuperAdmin cannot be force logged out." };
  }
  const logoutTime = new Date();
  try {
    if (!sessionsAlreadyRevoked) {
      const sessionUpdate: Record<string, unknown> = {
        lastLogout: logoutTime,
        "webSession.sessionId": null,
        "webSession.sessionStartedAt": null,
        "webSession.expiresAt": null,
        "webSession.isLoggedIn": false,
        "mobileSession.sessionId": null,
        "mobileSession.sessionStartedAt": null,
        "mobileSession.lastActiveAt": null,
        "mobileSession.isLoggedIn": false,
        // Invalidate tokens for ALL device types.
        tokenValidAfter: Date.now(),
        webTokenValidAfter: Date.now(),
        mobileTokenValidAfter: Date.now(),
      };
      if (rotateCredentials) {
        const newPassword = generatePassword(6);
        const newMobilePin = generateMobilePin(4);
        sessionUpdate.password = newPassword;
        sessionUpdate.mobilePin = newMobilePin;
        sessionUpdate.passwordExpiresAt = computePasswordExpiryDate();
        console.log(
          `🔐 Forced logout for ${employee.email}: New password generated: ${newPassword}`,
        );
      }
      await Employees.updateOne(
        { _id: employeeId },
        { $set: sessionUpdate },
      );
    }
  } catch (updateError: unknown) {
    console.error("Error during employee update and password change:", updateError);
    return { success: false, message: "Failed to update employee data" };
  }
  try {
    const forcedLogoutLog = new EmployeeActivityLog({
      employeeId,
      employeeName: employee.name,
      employeeEmail: employee.email,
      role: employee.role,
      activityType: "logout",
      logoutTime,
      duration: 0,
      notes: `Forced logout by ${actorName} (${actorRole}).${notes ? ` ${notes}` : ""}${rotateCredentials ? " Password changed." : " Credentials preserved."}`,
      sessionId: sessionId || null,
      status: "ended",
      lastActivityAt: logoutTime,
    });
    await forcedLogoutLog.save();
  } catch (logError: unknown) {
    console.error("Error creating activity log for forced logout:", logError);
    // Don't fail the operation if logging fails
  }
  try {
    const { endActiveEmployeeLoginSessions } = await import(
      "@/util/employeeActivitySession"
    );
    await endActiveEmployeeLoginSessions({
      employeeId,
      logoutTime,
      sessionId: sessionId || null,
    });
  } catch (e) {
    console.warn("Failed to update activity logs during force logout:", e);
  }
  // emit socket event for realtime clients and disconnect sockets in rooms
  try {
    const io = (global as unknown as { io?: SocketIoServerLike }).io;
    if (io) {
      const payload: Record<string, unknown> = { _id: employeeId, sessionId };
      if (reason) payload.reason = reason;
      if (message) payload.message = message;
      io.to(`user-${employeeId}`).emit("force-logout", payload);
      if (sessionId) {
        io.to(`session-${sessionId}`).emit("force-logout", payload);
      }
      try {
        const userRoom = `user-${employeeId}`;
        const userSockets = await io.in(userRoom).fetchSockets();
        for (const s of userSockets) {
          try {
            s.disconnect(true);
          } catch {
            // ignore individual disconnect failures
          }
        }
        if (sessionId) {
          const sessionRoom = `session-${sessionId}`;
          const sessionSockets = await io.in(sessionRoom).fetchSockets();
          for (const s of sessionSockets) {
            try {
              s.disconnect(true);
            } catch {
              // ignore
            }
          }
        }
      } catch (err) {
        console.warn("Failed to fetch/disconnect sockets during force logout:", err);
      }
    }
  } catch (e) {
    console.warn("Socket emit failed for force logout:", e);
  }
  return { success: true, message: "Employee force-logged out" };
}
interface SocketLike {
  disconnect: (close?: boolean) => void;
}
interface SocketIoServerLike {
  to: (room: string) => { emit: (event: string, payload: unknown) => void };
  in: (room: string) => { fetchSockets: () => Promise<SocketLike[]> };
}