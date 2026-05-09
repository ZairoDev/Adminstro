export function normalizeLocation(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeAllotedArea(input: string | string[] | undefined): string[] {
  if (!input) return [];
  const raw = Array.isArray(input) ? input : [input];
  const normalized = raw
    .map((v) => normalizeLocation(String(v)))
    .filter((v) => v.length > 0);

  // dedupe while preserving order
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of normalized) {
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

