import mongoose from "mongoose";
import Employees from "@/models/employee";
import { canCorrectAttendance, type AttendanceActor } from "@/modules/attendance/access";
import { AttendanceError } from "@/modules/attendance/errors";
import { connectDb } from "@/util/db";

export type AttendanceReadScope =
  | { kind: "company" }
  | { kind: "team"; employeeIds: string[] };

export type ReportLink = {
  id: string;
  managerId: string | null;
};

/** Everyone who reports up to this manager, including teams under those people. */
export function descendantIds(managerId: string, links: ReportLink[]): string[] {
  const childrenByParent = new Map<string, string[]>();
  for (const link of links) {
    if (!link.managerId || link.managerId === link.id) continue;
    const list = childrenByParent.get(link.managerId) ?? [];
    list.push(link.id);
    childrenByParent.set(link.managerId, list);
  }

  const descendants: string[] = [];
  const seen = new Set<string>();
  const stack = [...(childrenByParent.get(managerId) ?? [])];
  while (stack.length > 0) {
    const id = stack.pop();
    if (!id || seen.has(id) || id === managerId) continue;
    seen.add(id);
    descendants.push(id);
    const children = childrenByParent.get(id);
    if (children) {
      for (const child of children) stack.push(child);
    }
  }
  return descendants;
}

export async function listDescendantEmployeeIds(managerId: string): Promise<string[]> {
  if (!mongoose.Types.ObjectId.isValid(managerId)) return [];
  await connectDb();
  const rows = await Employees.find({ reportingManagerId: { $ne: null } })
    .select("_id reportingManagerId role")
    .lean<{ _id: unknown; reportingManagerId?: unknown; role?: string }[]>();
  const links: ReportLink[] = [];
  for (const row of rows) {
    if (row.role === "Guest") continue;
    links.push({
      id: String(row._id),
      managerId: row.reportingManagerId != null ? String(row.reportingManagerId) : null,
    });
  }
  return descendantIds(managerId, links);
}

async function actorIsReportingManager(actorId: string): Promise<boolean> {
  if (!mongoose.Types.ObjectId.isValid(actorId)) return false;
  await connectDb();
  const row = await Employees.findById(actorId)
    .select("isReportingManager")
    .lean<{ isReportingManager?: boolean } | null>();
  return row?.isReportingManager === true;
}

/** Sidebar hint. Company readers already have the full attendance link. */
export async function attendanceNavScope(
  actor: AttendanceActor,
): Promise<"company" | "team" | "none"> {
  if (canCorrectAttendance(actor.role)) return "company";
  if (!(await actorIsReportingManager(actor.id))) return "none";
  return "team";
}

export async function resolveAttendanceReadScope(
  actor: AttendanceActor,
): Promise<AttendanceReadScope> {
  if (canCorrectAttendance(actor.role)) return { kind: "company" };
  if (!(await actorIsReportingManager(actor.id))) {
    throw new AttendanceError(403, "Attendance access required");
  }
  const employeeIds = await listDescendantEmployeeIds(actor.id);
  return { kind: "team", employeeIds };
}

export async function assertCanViewEmployeeAttendance(
  actor: AttendanceActor,
  employeeId: string,
): Promise<void> {
  if (actor.id === employeeId) return;
  if (canCorrectAttendance(actor.role)) return;
  if (!(await actorIsReportingManager(actor.id))) {
    throw new AttendanceError(403, "You can only view your own attendance");
  }
  const employeeIds = await listDescendantEmployeeIds(actor.id);
  if (!employeeIds.includes(employeeId)) {
    throw new AttendanceError(403, "You can only view attendance for employees who report to you");
  }
}
