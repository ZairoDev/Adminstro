import cron from "node-cron";
import PersonalReminder from "@/models/personalReminder";
import Employees from "@/models/employee";
import { connectDb } from "@/util/db";
import { sendPersonalReminderEmail } from "@/lib/email";
import { lockEmployeesWithOverduePips } from "@/lib/employee/pipAutoLock";

const DEFAULT_CRON = "*/5 * * * *";

function formatScheduledAt(date: Date): string {
  return date.toLocaleString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export async function processDuePersonalReminders(): Promise<void> {
  await connectDb();

  try {
    const locked = await lockEmployeesWithOverduePips();
    if (locked > 0) {
      console.log(`[pip-auto-lock] Locked ${locked} employee(s) with overdue active PIP`);
    }
  } catch (err) {
    console.error("[pip-auto-lock] Cron run failed:", err);
  }

  const now = new Date();
  const due = await PersonalReminder.find({
    status: "pending",
    scheduledAt: { $lte: now },
    emailSentAt: null,
  })
    .limit(50)
    .lean();

  if (due.length === 0) return;

  const baseUrl =
    process.env.NEXT_PUBLIC_URL?.replace(/\/$/, "") || "https://adminstro.in";

  for (const reminder of due) {
    try {
      const employee = await Employees.findById(reminder.employeeId)
        .select("email name")
        .lean();

      const email = String((employee as { email?: string })?.email ?? "").trim();
      if (!email) {
        console.warn(
          `[personal-reminder] Skipping ${reminder._id}: no employee email`,
        );
        continue;
      }

      const employeeName = String((employee as { name?: string })?.name ?? "there");
      const scheduledAt = new Date(reminder.scheduledAt);

      const result = await sendPersonalReminderEmail({
        to: email,
        employeeName,
        title: reminder.title || "Reminder",
        note: reminder.note,
        scheduledAt,
        appUrl: `${baseUrl}/dashboard/my-reminders`,
      });

      if (!result.success) {
        console.error(
          `[personal-reminder] Email failed for ${reminder._id}:`,
          result.error,
        );
        continue;
      }

      await PersonalReminder.updateOne(
        { _id: reminder._id, emailSentAt: null },
        {
          $set: {
            emailSentAt: new Date(),
            status: "sent",
          },
        },
      );

      console.log(
        `[personal-reminder] Sent email for reminder ${reminder._id} → ${email} (${formatScheduledAt(scheduledAt)})`,
      );
    } catch (err) {
      console.error(`[personal-reminder] Error processing ${reminder._id}:`, err);
    }
  }
}

export const startPersonalReminderScheduler = () => {
  const expression = process.env.PERSONAL_REMINDER_CRON ?? DEFAULT_CRON;

  cron.schedule(expression, async () => {
    try {
      await processDuePersonalReminders();
    } catch (err) {
      console.error("[personal-reminder] Cron run failed:", err);
    }
  });

  console.log(
    "[personal-reminder] Scheduler started | cron:",
    expression,
  );
};
