import mongoose from "mongoose";
import Employees from "@/models/employee";

export async function assertValidReportingManager(
  employeeId: string,
  managerId: string | null,
): Promise<{ ok: true } | { ok: false; message: string; status: number }> {
  if (!managerId) return { ok: true };

  if (!mongoose.Types.ObjectId.isValid(managerId)) {
    return { ok: false, message: "Invalid reporting manager id", status: 400 };
  }
  if (String(managerId) === String(employeeId)) {
    return {
      ok: false,
      message: "Employee cannot report to themselves",
      status: 400,
    };
  }

  const manager = await Employees.findById(managerId)
    .select("isActive isReportingManager reportingManagerId")
    .lean<{
      isActive?: boolean;
      isReportingManager?: boolean;
      reportingManagerId?: unknown;
    } | null>();

  if (!manager || manager.isActive === false) {
    return {
      ok: false,
      message: "Reporting manager must be an active employee",
      status: 400,
    };
  }
  if (manager.isReportingManager !== true) {
    return {
      ok: false,
      message: "Selected employee is not marked as a Reporting Manager",
      status: 400,
    };
  }

  // Walk up the chain to prevent cycles.
  let cursor: string | null =
    manager.reportingManagerId != null
      ? String(manager.reportingManagerId)
      : null;
  const seen = new Set<string>([String(managerId)]);
  while (cursor) {
    if (cursor === String(employeeId)) {
      return {
        ok: false,
        message: "This assignment would create a reporting cycle",
        status: 400,
      };
    }
    if (seen.has(cursor)) break;
    seen.add(cursor);
    const next = await Employees.findById(cursor)
      .select("reportingManagerId")
      .lean<{ reportingManagerId?: unknown } | null>();
    cursor =
      next?.reportingManagerId != null
        ? String(next.reportingManagerId)
        : null;
  }

  return { ok: true };
}

export async function assertValidTrainer(
  trainerId: string | null,
): Promise<{ ok: true } | { ok: false; message: string; status: number }> {
  if (!trainerId) return { ok: true };
  if (!mongoose.Types.ObjectId.isValid(trainerId)) {
    return { ok: false, message: "Invalid trainer id", status: 400 };
  }
  const trainer = await Employees.findById(trainerId)
    .select("isActive isTrainer")
    .lean<{ isActive?: boolean; isTrainer?: boolean } | null>();
  if (!trainer || trainer.isActive === false) {
    return {
      ok: false,
      message: "Trainer must be an active employee",
      status: 400,
    };
  }
  if (trainer.isTrainer !== true) {
    return {
      ok: false,
      message: "Selected employee is not marked as a Trainer",
      status: 400,
    };
  }
  return { ok: true };
}
