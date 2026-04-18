type Primitive = string | number | boolean | null | undefined | Date;

export type TemplateData = Record<string, Primitive>;
const IF_BLOCK_REGEX = /\{\{#if\s+([a-zA-Z0-9_]+)\s*\}\}([\s\S]*?)\{\{\/if\}\}/g;

function toStringValue(v: Primitive): string {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

function isTruthy(v: Primitive): boolean {
  return v !== undefined && v !== null && v !== "" && v !== 0 && v !== false;
}

// Minimal HTML escaping to prevent accidental HTML injection through dynamic fields.
// Intentionally not escaping the full template HTML (only values).
function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderTemplate(html: string, data: TemplateData): string {
  const withBlocks = html.replace(
    IF_BLOCK_REGEX,
    (_match, key: string, inner: string) => {
      const raw = data[key];
      return isTruthy(raw) ? inner : "";
    },
  );

  // Replaces placeholders like {{ownerName}} using provided data.
  // Unknown keys resolve to empty string (safe for partial templates).
  return withBlocks.replace(
    /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,
    (_match, key: string) => {
      const raw = toStringValue(data[key]);
      return escapeHtml(raw);
    },
  );
}

