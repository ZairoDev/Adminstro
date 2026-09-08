import { customAlphabet } from "nanoid";

import Employees from "@/models/employee";

/**
 * Employee-facing display ID: "ZI-" + 6 alphanumeric characters, e.g. "ZI-4K7QXH".
 *
 * Design notes:
 * - Alphabet excludes visually ambiguous characters (0/O, 1/I/L) since this ID
 *   gets read aloud, typed manually, and printed on ID cards.
 * - Uppercase only, for consistency (no mixed-case confusion).
 * - Random (not sequential) so it never leaks headcount or hire order.
 * - Uniqueness is ultimately guaranteed by a unique+sparse index on
 *   `Employees.employeeCode` (see src/models/employee.ts). The helpers below
 *   just make collisions vanishingly unlikely and provide a safe retry path
 *   for the rare case a race condition produces one.
 */
export const EMPLOYEE_CODE_PREFIX = "ZI-";
export const EMPLOYEE_CODE_SUFFIX_LENGTH = 6;
export const EMPLOYEE_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const EMPLOYEE_CODE_REGEX = /^ZI-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;

const generateSuffix = customAlphabet(
  EMPLOYEE_CODE_ALPHABET,
  EMPLOYEE_CODE_SUFFIX_LENGTH,
);

const MAX_GENERATION_ATTEMPTS = 8;
const MAX_PERSIST_ATTEMPTS = 5;

/** Generates a single ZI-XXXXXX candidate. Pure — does not check uniqueness. */
export function generateEmployeeCodeCandidate(): string {
  return `${EMPLOYEE_CODE_PREFIX}${generateSuffix()}`;
}

/** True if `error` is a MongoDB duplicate-key error on the given field. */
export function isDuplicateKeyErrorForField(
  error: unknown,
  field: string,
): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { code?: number; keyPattern?: Record<string, unknown> };
  return err.code === 11000 && Boolean(err.keyPattern && field in err.keyPattern);
}

/**
 * Generates a ZI-XXXXXX code that does not currently exist in the Employees
 * collection. This is a pre-check for the common case only — under
 * concurrent creation, two callers could both pass this check for different
 * codes safely (no shared state), so this alone does not need any locking.
 */
export async function generateUniqueEmployeeCode(): Promise<string> {
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const candidate = generateEmployeeCodeCandidate();
    // eslint-disable-next-line no-await-in-loop
    const exists = await Employees.exists({ employeeCode: candidate });
    if (!exists) return candidate;
  }
  throw new Error(
    "generateUniqueEmployeeCode: failed to find an available code after multiple attempts",
  );
}

/**
 * Runs `persist(code)` with a freshly generated, pre-checked-unique code,
 * retrying with a new code if the persist step fails on the unique index
 * (i.e. a race condition slipped past the pre-check). Any other error is
 * rethrown immediately without retrying.
 *
 * Use this to wrap the single DB write that actually assigns the code
 * (a `.save()` or `updateOne`), whether creating a new employee or
 * backfilling a legacy one.
 */
export async function withUniqueEmployeeCode<T>(
  persist: (code: string) => Promise<T>,
  maxAttempts: number = MAX_PERSIST_ATTEMPTS,
): Promise<T> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = await generateUniqueEmployeeCode();
    try {
      // eslint-disable-next-line no-await-in-loop
      return await persist(code);
    } catch (error) {
      const isLastAttempt = attempt === maxAttempts - 1;
      if (isDuplicateKeyErrorForField(error, "employeeCode") && !isLastAttempt) {
        continue;
      }
      throw error;
    }
  }
  throw new Error(
    "withUniqueEmployeeCode: failed to persist a unique employee code after multiple attempts",
  );
}
