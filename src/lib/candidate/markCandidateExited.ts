import Candidate from "@/models/candidate";

export const CANDIDATE_EXIT_REASONS = [
  "resigned",
  "terminated",
  "suspended",
  "abscond",
] as const;

export type CandidateExitReason = (typeof CANDIDATE_EXIT_REASONS)[number];

export function asCandidateExitReason(
  value: unknown
): CandidateExitReason | null {
  if (typeof value !== "string") return null;
  return CANDIDATE_EXIT_REASONS.includes(value as CandidateExitReason)
    ? (value as CandidateExitReason)
    : null;
}

/**
 * Mark the candidate linked to an employee as exited (Onboarded → Exited tab).
 * Safe no-op when no linked candidate exists.
 */
export async function markCandidateExitedByEmployeeId(
  employeeId: string,
  exitReason: CandidateExitReason | null,
  options?: {
    exitedAt?: Date;
    exitNotes?: string | null;
  },
): Promise<{ matched: boolean }> {
  const exitedAt = options?.exitedAt ?? new Date();
  const exitNotes =
    typeof options?.exitNotes === "string" && options.exitNotes.trim()
      ? options.exitNotes.trim()
      : null;

  const result = await Candidate.findOneAndUpdate(
    {
      employeeId,
      exitedAt: { $in: [null, undefined] },
    },
    {
      $set: {
        exitedAt,
        exitReason,
        exitNotes,
      },
    },
    { new: true },
  );

  return { matched: Boolean(result) };
}

/**
 * Clear the linked candidate's exited fields when an employee is reactivated.
 * Safe no-op when no linked candidate exists.
 */
export async function clearCandidateExit(
  employeeId: string,
): Promise<{ matched: boolean }> {
  const candidate = await Candidate.findOne({ employeeId });

  if (!candidate) {
    return { matched: false };
  }

  candidate.exitedAt = null;
  candidate.exitReason = null;
  candidate.exitNotes = null;

  await candidate.save();

  return { matched: true };
}
