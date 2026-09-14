import Employees from "@/models/employee";



/**
 * Locks employees who have an active PIP past its end date.
 * Intended for cron invocation — not read endpoints.
 */
export async function lockEmployeesWithOverduePips(): Promise<number> {
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);
  const todayDateKey = startOfToday.toISOString().slice(0, 10);

  // Conditional update is race-safe: if HR resolves the PIP before this write,
  // the document no longer matches and cannot be re-locked from stale data.
  const result = await Employees.updateMany(
    {
      pips: {
        $elemMatch: {
          status: "active",
          endDate: { $lt: todayDateKey },
        },
      },
      $or: [
        { isLocked: { $ne: true } },
        { lockReason: { $ne: "pip" } },
      ],
    },
    {
      $set: {
        isLocked: true,
        lockReason: "pip",
      },
    },
  );

  

  return result.modifiedCount
  ;
}
