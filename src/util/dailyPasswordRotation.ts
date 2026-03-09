import cron from "node-cron";
import Employees from "@/models/employee";
import EmployeeActivityLog from "@/models/employeeActivityLog";
import { connectDb } from "@/util/db";
import { generatePassword } from "./generatePassword";
import { computePasswordExpiryMs } from "./passwordExpiry";



const PASSWORD_VALIDITY_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Emit force-logout to user's socket room and disconnect their clients (same as forceLogout API). */
async function emitForceLogoutAndDisconnect(employeeId: string): Promise<void> {
  const io = (global as unknown as { io?: { to: (r: string) => { emit: (e: string, d: object) => void }; in: (r: string) => { fetchSockets: () => Promise<{ disconnect: (v: boolean) => void }[]> } } }).io;
  if (!io) return;
  try {
    const room = `user-${employeeId}`;
    io.to(room).emit("force-logout", { _id: employeeId });
    const sockets = await io.in(room).fetchSockets();
    for (const s of sockets) {
      try {
        s.disconnect(true);
      } catch {
        // ignore
      }
    }
  } catch (err) {
    console.warn(`[password-rotation] Socket force-logout for ${employeeId}:`, err);
  }
}

/** End active activity log sessions for this employee (same as forceLogout API). */
async function endActivityLogSessions(employeeId: string, logoutTime: Date): Promise<void> {
  try {
    const activeSessions = await EmployeeActivityLog.find({
      employeeId,
      status: "active",
      activityType: "login",
    });
    await Promise.all(
      activeSessions.map((session: { loginTime?: Date; logoutTime?: Date; duration?: number; status: string; lastActivityAt?: Date; save: () => Promise<unknown> }) => {
        const loginTime = session.loginTime ? new Date(session.loginTime) : null;
        const durationMinutes = loginTime
          ? Math.max(0, Math.round((logoutTime.getTime() - loginTime.getTime()) / (1000 * 60)))
          : 0;
        session.logoutTime = logoutTime;
        session.duration = durationMinutes;
        session.status = "ended";
        session.lastActivityAt = logoutTime;
        return session.save().catch(() => undefined);
      }),
    );
  } catch (e) {
    console.warn("[password-rotation] Failed to end activity logs for", employeeId, e);
  }
}

/** Create activity log entry for forced logout (password rotation). */
async function createForcedLogoutLog(employee: any, logoutTime: Date): Promise<void> {
  try {
    const forcedLogoutLog = new EmployeeActivityLog({
      employeeId: employee._id.toString(),
      employeeName: employee.name,
      employeeEmail: employee.email,
      role: employee.role,
      activityType: "logout",
      logoutTime,
      duration: 0, // No duration for forced logout
      notes: "Automatic password rotation - forced logout. Password changed.",
      sessionId: null,
      status: "ended",
      lastActivityAt: logoutTime,
    });
    await forcedLogoutLog.save();
  } catch (e) {
    console.warn("[password-rotation] Failed to create activity log for", employee.email, e);
  }
}

// 🔁 Main rotation function
export const rotatePasswordsNow = async () => {
  console.log("🔁 Starting daily password rotation...");

  await connectDb();

  const employees = await Employees.find({
    isActive: true,
    isLocked: false,
    inactiveReason: null,
    role: { $nin: ["SuperAdmin", "Developer", "HR", "Content", "HAdmin"] },
  });

  const now = Date.now();
  const logoutTime = new Date();

  for (const emp of employees) {
    try {
      const newPassword = generatePassword(6);

      const employeeId = emp._id.toString();

      await Employees.updateOne(
        { _id: emp._id },
        {
          $set: {
            password: newPassword,
            passwordExpiresAt: new Date(computePasswordExpiryMs()),
            tokenValidAfter: now,
            sessionId: null,
            sessionStartedAt: null,
            isLoggedIn: false,
            lastLogout: logoutTime,
          },
        },
      );

      await endActivityLogSessions(employeeId, logoutTime);
      await createForcedLogoutLog(emp, logoutTime);
      await emitForceLogoutAndDisconnect(employeeId);

      // 🔥 TODO: Send password securely (Email / WhatsApp / Internal Panel)
      console.log(
        `✅ Password rotated for ${emp.email} | New Password: ${newPassword}`,
      );
    } catch (err) {
      console.error(`❌ Failed rotating password for ${emp.email}:`, err);
    }
  }

  console.log("✅ Daily password rotation completed.");
};

const DEFAULT_CRON_IST_10PM = "* 22 * * *";

export const startDailyPasswordScheduler = () => {
  const expression =
    process.env.PASSWORD_ROTATION_CRON ?? DEFAULT_CRON_IST_10PM;

  cron.schedule(
    expression,
    async () => {
      console.log("🕙 Password rotation triggered by cron");
      await rotatePasswordsNow();
    },
    { timezone: "Asia/Kolkata" },
  );

  console.log(
    "🕙 Daily password scheduler started | cron:",
    expression,
    "| timezone: Asia/Kolkata",
  );
};
