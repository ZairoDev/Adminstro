type Primitive = string | number | boolean | null | undefined | Date;

export type TemplateData = Record<string, Primitive>;

function toStringValue(v: Primitive): string {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString();
  return String(v);
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
  // Replaces placeholders like {{ownerName}} using provided data.
  // Unknown keys resolve to empty string (safe for partial templates).
  return html.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
    const raw = toStringValue(data[key]);
    return escapeHtml(raw);
  });
}

