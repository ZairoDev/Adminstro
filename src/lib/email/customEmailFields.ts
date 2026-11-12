/** Pull optional edited subject/html from an API request body. */
export function readCustomEmailFields(body: unknown): {
  customEmailSubject?: string;
  customEmailHtml?: string;
} {
  if (!body || typeof body !== "object") {
    return {};
  }
  const record = body as Record<string, unknown>;
  const subject =
    typeof record.customEmailSubject === "string"
      ? record.customEmailSubject.trim()
      : "";
  const html =
    typeof record.customEmailHtml === "string"
      ? record.customEmailHtml.trim()
      : "";

  if (!subject || !html) {
    return {};
  }

  return {
    customEmailSubject: subject,
    customEmailHtml: html,
  };
}

export function hasCustomEmail(
  fields: ReturnType<typeof readCustomEmailFields>,
): fields is { customEmailSubject: string; customEmailHtml: string } {
  return Boolean(fields.customEmailSubject && fields.customEmailHtml);
}
