import cron from "node-cron";

import Employees from "@/models/employee";
import EmployeeActivityLog from "@/models/employeeActivityLog";
import { connectDb } from "@/util/db";
import { clockOnDate, istDateKey } from "@/modules/attendance/dates";
import { endActiveEmployeeLoginSessions } from "@/util/employeeActivitySession";

type EmployeeLean = {
  _id: unknown;
  name?: string;
  email?: string;
  role?: string;
  webSession?: { sessionId?: string | null; isLoggedIn?: boolean } | null;
  mobileSession?: { sessionId?: string | null; isLoggedIn?: boolean } | null;
};

/**
 * Force-end every still-active web/mobile session at IST 23:59 for the
 * current calendar day. Checkout is stamped 23:59 with device "system".
 * Does not rotate passwords (unlike HR force-logout).
 */
export async function autoLogoutActiveSessionsAtDayEnd(
  now: Date = new Date(),
): Promise<number> {
  await connectDb();

  const dateKey = istDateKey(now);
  const logoutTime = clockOnDate(dateKey, "23:59");

  const stillLoggedIn = await Employees.find({
    $or: [
      { "webSession.isLoggedIn": true },
      { "mobileSession.isLoggedIn": true },
    ],
  })
    .select("name email role webSession mobileSession")
    .lean<EmployeeLean[]>();

  if (stillLoggedIn.length === 0) return 0;

  let closed = 0;

  for (const employee of stillLoggedIn) {
    const employeeId = String(employee._id);
    try {
      await Employees.updateOne(
        { _id: employee._id },
        {
          $set: {
            lastLogout: logoutTime,
            "webSession.sessionId": null,
            "webSession.sessionStartedAt": null,
            "webSession.expiresAt": null,
            "webSession.isLoggedIn": false,
            "mobileSession.sessionId": null,
            "mobileSession.sessionStartedAt": null,
            "mobileSession.lastActiveAt": null,
            "mobileSession.isLoggedIn": false,
            tokenValidAfter: Date.now(),
            webTokenValidAfter: Date.now(),
            mobileTokenValidAfter: Date.now(),
          },
        },
      );

      await endActiveEmployeeLoginSessions({
        employeeId,
        logoutTime,
      });

      await EmployeeActivityLog.create({
        employeeId,
        employeeName: employee.name || "",
        employeeEmail: employee.email || "",
        role: employee.role || "",
        activityType: "logout",
        logoutTime,
        duration: 0,
        deviceInfo: "system",
        notes: "Auto logout at end of day (23:59 IST)",
        sessionId: null,
        status: "ended",
        lastActivityAt: logoutTime,
      });

      try {
        const io = (global as unknown as {
          io?: {
            to: (room: string) => { emit: (event: string, payload: unknown) => void };
            in: (room: string) => {
              fetchSockets: () => Promise<{ disconnect: (close?: boolean) => void }[]>;
            };
          };
        }).io;
        if (io) {
          const payload = {
            _id: employeeId,
            reason: "end_of_day",
            message: "Your session ended at 23:59. Please log in again tomorrow.",
          };
          const room = `user-${employeeId}`;
          io.to(room).emit("force-logout", payload);
          const sockets = await io.in(room).fetchSockets();
          for (const socket of sockets) {
            try {
              socket.disconnect(true);
            } catch {
              // ignore
            }
          }
        }
      } catch {
        // socket optional
      }

      closed += 1;
    } catch (error) {
      console.warn(
        `[attendance] End-of-day logout failed for ${employeeId}:`,
        error,
      );
    }
  }

  console.log(
    `[attendance] End-of-day auto logout closed ${closed} session(s) at ${dateKey} 23:59 IST`,
  );

  try {
    const { reconcileRecentAttendance } = await import(
      "@/modules/attendance/service"
    );
    // Also backfills past missing checkouts to 23:59 IST.
    await reconcileRecentAttendance();
  } catch (error) {
    console.warn(
      "[attendance] Post end-of-day reconcile failed:",
      error,
    );
  }

  return closed;
}

/** Cron: 23:59 Asia/Kolkata every day. */
export function startEndOfDayAutoLogoutScheduler(): void {
  cron.schedule(
    "59 23 * * *",
    () => {
      autoLogoutActiveSessionsAtDayEnd().catch((error: unknown) => {
        console.warn("[attendance] End-of-day auto logout failed:", error);
      });
    },
    { timezone: "Asia/Kolkata" },
  );
  console.log("[attendance] End-of-day auto logout scheduler started | cron: 59 23 * * * IST");
}
