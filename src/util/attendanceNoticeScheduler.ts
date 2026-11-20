import cron from "node-cron";
import { scanMissingLogins } from "@/modules/attendance/notices/missing-login";

const DEFAULT_CRON = "*/15 * * * *";

/** Looks for working days whose shift cutoff has passed with no login. */
export function startAttendanceNoticeScheduler(): void {
  const expression = process.env.ATTENDANCE_NOTICE_CRON ?? DEFAULT_CRON;
  cron.schedule(
    expression,
    () => {
      scanMissingLogins().catch((error: unknown) => {
        console.warn("[attendance-notice] Missing-login scan failed:", error);
      });
    },
    { timezone: "Asia/Kolkata" },
  );
  console.log("[attendance-notice] Scheduler started | cron:", expression);
}
