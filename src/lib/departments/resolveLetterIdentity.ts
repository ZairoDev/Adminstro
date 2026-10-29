import Role from "@/models/role";
import { escapeRegex } from "@/lib/departments/jobIdentity";

type LetterCandidate = {
  position?: string | null;
  department?: string | null;
  selectionDetails?: { role?: string | null } | null;
};

/**
 * Prefer the job title and department stored on the candidate.
 * Older candidates only have a title, so fall back to the legacy roles collection.
 */
export async function resolveLetterJobIdentity(
  candidate: LetterCandidate,
): Promise<{ jobTitle: string; department: string }> {
  const jobTitle = (candidate.selectionDetails?.role || candidate.position || "").trim();
  const department = (candidate.department || "").trim();
  if (jobTitle && department) {
    return { jobTitle, department };
  }
  if (!jobTitle) {
    return { jobTitle, department };
  }

  const exact = (await Role.findOne({ role: jobTitle }).lean()) as {
    role: string;
    department: string;
  } | null;
  const roleDoc =
    exact ||
    ((await Role.findOne({
      role: { $regex: new RegExp(`^${escapeRegex(jobTitle)}$`, "i") },
    }).lean()) as { role: string; department: string } | null);

  return {
    jobTitle: roleDoc?.role || jobTitle,
    department: roleDoc?.department || department,
  };
}
