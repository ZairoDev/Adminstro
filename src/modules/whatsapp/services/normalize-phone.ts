/**
 * Canonical participant phone for conversation identity lookups.
 * Digits-only; fixes common doubled country-code typos.
 */
export function normalizePhone(raw: string): string {
  let digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.startsWith("9191") && digits.length === 14) {
    digits = digits.slice(2);
  }
  if (digits.startsWith("3030") && digits.length === 14) {
    digits = digits.slice(2);
  }
  return digits;
}
