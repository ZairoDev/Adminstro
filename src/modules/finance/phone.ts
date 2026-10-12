/**
 * Normalize phone for matching: strip non-digits, then reduce to last 10 digits
 * so +91 / spaces / dashes do not block exact matches.
 */
export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const digits = String(phone).replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length > 10) {
    return digits.slice(-10);
  }
  return digits;
}

export function phonesMatch(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const na = normalizePhone(a);
  const nb = normalizePhone(b);
  if (!na || !nb) return false;
  return na === nb;
}
