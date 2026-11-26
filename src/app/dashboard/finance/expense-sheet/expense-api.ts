import axios from "@/util/axios";

/** Reads the `message` the finance API sends with an error, or falls back. */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (
    axios.isAxiosError(error) &&
    typeof error.response?.data === "object" &&
    error.response.data !== null &&
    "message" in error.response.data &&
    typeof error.response.data.message === "string"
  ) {
    return error.response.data.message;
  }
  return fallback;
}

const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;
export const MAX_EXPENSE_AMOUNT = 1_000_000_000;

/** Parses a rupee amount typed into a form. Returns null when it is not valid. */
export function readAmount(value: string): number | null {
  const trimmed = value.trim();
  if (!AMOUNT_PATTERN.test(trimmed)) return null;
  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount > MAX_EXPENSE_AMOUNT) return null;
  return amount;
}
