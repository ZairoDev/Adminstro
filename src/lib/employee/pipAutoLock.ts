import Employees from "@/models/employee";

interface PipRecord {
  status?: string;
  endDate?: Date | string;
}

interface EmployeeWithPips {
  _id: unknown;
  isLocked?: boolean;
  pips?: PipRecord[];
}

/**
 * Locks employees who have an active PIP past its end date.
 * Intended for cron invocation — not read endpoints.
 */
export async function lockEmployeesWithOverduePips(): Promise<number> {
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  const candidates = (await Employees.find({
    isLocked: { $ne: true },
    "pips.status": "active",
  })
    .select("_id isLocked pips")
    .lean()) as EmployeeWithPips[];

  let lockedCount = 0;

  for (const employee of candidates) {
    const pips = employee.pips ?? [];
    const hasOverdueActivePIP = pips.some(
      (p) =>
        p.status === "active" &&
        p.endDate != null &&
        new Date(p.endDate) < startOfToday,
    );

    if (hasOverdueActivePIP) {
      await Employees.findByIdAndUpdate(employee._id, { isLocked: true });
      lockedCount += 1;
    }
  }

  return lockedCount;
}
