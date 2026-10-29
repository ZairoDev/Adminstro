import mongoose, { Types } from "mongoose";
import Department from "@/models/department";
import JobPosition from "@/models/jobPosition";

export class JobIdentityError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "JobIdentityError";
    this.status = status;
  }
}

export type JobIdentitySnapshot = {
  departmentId: Types.ObjectId;
  jobPositionId: Types.ObjectId;
  department: string;
  jobTitle: string;
};

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function nameMatch(name: string): { $regex: RegExp } {
  return { $regex: new RegExp(`^${escapeRegex(name.trim())}$`, "i") };
}

export async function findDepartmentByName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return null;
  return Department.findOne({ name: nameMatch(trimmed) });
}

export async function findJobPositionByName(departmentId: Types.ObjectId, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return null;
  return JobPosition.findOne({
    departmentId,
    name: nameMatch(trimmed),
  });
}

/**
 * Resolve a department + job position pair into the snapshot stored on a person.
 * Both ids are required together. Pass requireActive for the public application form.
 */
export async function resolveJobIdentity(
  departmentIdRaw: unknown,
  jobPositionIdRaw: unknown,
  options?: { requireActive?: boolean },
): Promise<JobIdentitySnapshot | null> {
  const departmentId =
    typeof departmentIdRaw === "string" ? departmentIdRaw.trim() : "";
  const jobPositionId =
    typeof jobPositionIdRaw === "string" ? jobPositionIdRaw.trim() : "";

  if (!departmentId && !jobPositionId) {
    return null;
  }
  if (!departmentId || !jobPositionId) {
    throw new JobIdentityError("Select both a department and a job position");
  }
  if (
    !mongoose.Types.ObjectId.isValid(departmentId) ||
    !mongoose.Types.ObjectId.isValid(jobPositionId)
  ) {
    throw new JobIdentityError("Department or job position is invalid");
  }

  const [department, position] = await Promise.all([
    Department.findById(departmentId).lean(),
    JobPosition.findById(jobPositionId).lean(),
  ]);

  if (!department || !position) {
    throw new JobIdentityError("Department or job position was not found", 404);
  }
  if (String(position.departmentId) !== String(department._id)) {
    throw new JobIdentityError("That job position does not belong to the selected department");
  }
  if (options?.requireActive && (!department.isActive || !position.isActive)) {
    throw new JobIdentityError("Select an active department and job position");
  }

  return {
    departmentId: department._id,
    jobPositionId: position._id,
    department: department.name,
    jobTitle: position.name,
  };
}
