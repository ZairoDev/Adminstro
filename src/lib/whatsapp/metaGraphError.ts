export type MetaGraphError = {
  message?: string;
  error_user_msg?: string;
  error_user_title?: string;
  error_data?: unknown;
  fbtrace_id?: string;
};

function readMetaErrorDataDetails(errorData: unknown): string | undefined {
  if (errorData == null) return undefined;
  if (typeof errorData === "string") {
    const s = errorData.trim();
    if (!s) return undefined;
    try {
      const parsed = JSON.parse(s) as Record<string, unknown>;
      const det = parsed.details ?? parsed.blame_field_specs;
      if (typeof det === "string" && det.trim()) return det.trim();
      if (det != null) return JSON.stringify(det);
    } catch {
      return s;
    }
    return undefined;
  }
  if (typeof errorData === "object") {
    const o = errorData as Record<string, unknown>;
    if (typeof o.details === "string" && o.details.trim()) return o.details.trim();
    if (o.details != null) return JSON.stringify(o.details);
  }
  return undefined;
}

/**
 * Human-readable text from a Meta Graph JSON error body (`{ error: { … } }`).
 */
export function collectMetaGraphErrorText(graphRoot: unknown): string | undefined {
  if (!graphRoot || typeof graphRoot !== "object") return undefined;
  const wrapped = graphRoot as { error?: MetaGraphError };
  const err = wrapped.error;
  if (!err || typeof err !== "object") return undefined;

  const parts: string[] = [];
  const details = readMetaErrorDataDetails(err.error_data);
  if (details?.trim()) parts.push(details.trim());
  if (typeof err.error_user_msg === "string" && err.error_user_msg.trim()) {
    parts.push(err.error_user_msg.trim());
  }
  if (typeof err.error_user_title === "string" && err.error_user_title.trim()) {
    parts.push(err.error_user_title.trim());
  }
  if (typeof err.message === "string" && err.message.trim()) {
    parts.push(err.message.trim());
  }
  if (typeof err.fbtrace_id === "string" && err.fbtrace_id.trim()) {
    parts.push(`fbtrace_id: ${err.fbtrace_id.trim()}`);
  }

  const seen = new Set<string>();
  const uniq = parts
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .filter((p) => {
      if (seen.has(p)) return false;
      seen.add(p);
      return true;
    });
  return uniq.length ? uniq.join(" — ") : undefined;
}
