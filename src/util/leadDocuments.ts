/** Roles allowed to view lead documents in detail view */
export const LEAD_DOCUMENT_VIEWER_ROLES = [
  "SuperAdmin",
  "LeadGen-TeamLead",
  "LeadGen",
] as const;

export type LeadDocumentViewerRole =
  (typeof LEAD_DOCUMENT_VIEWER_ROLES)[number];

export const MAX_LEAD_DOCUMENTS = 10;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export function canViewLeadDocuments(role: string | undefined): boolean {
  if (!role) return false;
  return LEAD_DOCUMENT_VIEWER_ROLES.includes(
    role as LeadDocumentViewerRole
  );
}

export function isAllowedLeadDocumentType(file: File): boolean {
  return ALLOWED_MIME_TYPES.has(file.type);
}

/** Store URLs as { "1": url, "2": url, ... } */
export function assignNumberedKeys(urls: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  urls.forEach((url, index) => {
    if (url) {
      result[String(index + 1)] = url;
    }
  });
  return result;
}

export function getSortedLeadDocumentEntries(
  docs: Record<string, string> | Map<string, string> | null | undefined
): { key: string; url: string }[] {
  if (!docs) return [];

  const record: Record<string, string> =
    docs instanceof Map ? Object.fromEntries(docs.entries()) : { ...docs };

  return Object.entries(record)
    .filter(([, url]) => Boolean(url))
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([key, url]) => ({ key, url }));
}

export function isPdfUrl(url: string): boolean {
  const path = url.split("?")[0] ?? "";
  return /\.pdf$/i.test(path);
}

/** Normalize Mongoose Map / plain object from API */
/** Accept only numbered keys with HTTP(S) URLs from the client */
export function sanitizeLeadDocumentsForSave(
  input: unknown
): Record<string, string> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }
  const result: Record<string, string> = {};
  for (const [key, val] of Object.entries(input)) {
    if (
      /^\d+$/.test(key) &&
      typeof val === "string" &&
      /^https?:\/\//i.test(val)
    ) {
      result[key] = val;
    }
  }
  return result;
}

export function normalizeLeadDocuments(
  raw: unknown
): Record<string, string> | undefined {
  if (!raw) return undefined;
  if (raw instanceof Map) {
    return Object.fromEntries(raw.entries()) as Record<string, string>;
  }
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, string>;
  }
  return undefined;
}

export function hasLeadDocuments(docs: unknown): boolean {
  return getSortedLeadDocumentEntries(normalizeLeadDocuments(docs)).length > 0;
}
