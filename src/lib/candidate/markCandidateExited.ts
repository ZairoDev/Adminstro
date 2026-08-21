import Candidate from "@/models/candidate";

export type CandidateExitReason =
  | "resigned"
  | "terminated"
  | "suspended"
  | "abscond";

/**
 * Mark the candidate linked to an employee as exited (Onboarded → Exited tab).
 * Safe no-op when no linked candidate exists.
 */
export async function markCandidateExitedByEmployeeId(
  employeeId: string,
  exitReason: CandidateExitReason,
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
