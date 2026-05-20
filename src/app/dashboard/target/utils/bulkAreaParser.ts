export type BulkAreaRow = Record<string, string>;

function detectDelimiter(headerLine: string): "," | "\t" {
  // Prefer tab if present (common for Excel copy/paste)
  if (headerLine.includes("\t")) return "\t";
  return ",";
}

function parseDelimitedLine(line: string, delimiter: "," | "\t"): string[] {
  // Minimal CSV/TSV parser with quoted fields support.
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === "\"") {
      // Double quote escape inside quotes: "" -> "
      const next = line[i + 1];
      if (inQuotes && next === "\"") {
        cur += "\"";
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && ch === delimiter) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

export function parseDelimitedTable(text: string): {
  delimiter: "," | "\t";
  headers: string[];
  rows: BulkAreaRow[];
} {
  const raw = String(text ?? "");
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { delimiter: ",", headers: [], rows: [] };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseDelimitedLine(lines[0], delimiter).map((h) => h.trim());

  const rows: BulkAreaRow[] = [];
  for (const line of lines.slice(1)) {
    const values = parseDelimitedLine(line, delimiter);
    const row: BulkAreaRow = {};
    for (let i = 0; i < headers.length; i++) {
      const key = headers[i] ?? "";
      if (!key) continue;
      row[key] = String(values[i] ?? "").trim();
    }
    rows.push(row);
  }

  return { delimiter, headers, rows };
}

export function parseAreaNamesList(text: string): string[] {
  const raw = String(text ?? "");
  const lines = raw.split(/\r?\n/);
  const names = lines
    .map((l) => l.trim())
    .filter(Boolean)
    .flatMap((l) => l.split(/[,;\t]/g).map((p) => p.trim()).filter(Boolean));

  const seen = new Set<string>();
  const unique: string[] = [];
  for (const name of names) {
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(name);
  }
  return unique;
}

/**
 * For "bulk areas in this city": accept a simple list, or a one-column table,
 * or a table with a `name` (or `area`) column.
 */
export function extractAreaNamesForCurrentCityUpload(text: string): string[] {
  const raw = String(text ?? "").trim();
  if (!raw) return [];

  const firstLine = raw.split(/\r?\n/).find((l) => l.trim().length > 0) ?? "";
  const looksTabular = firstLine.includes(",") || firstLine.includes("\t");
  if (!looksTabular) {
    return parseAreaNamesList(raw);
  }

  const { headers, rows } = parseDelimitedTable(raw);
  if (headers.length === 0 || rows.length === 0) {
    return parseAreaNamesList(raw);
  }

  const headerLower = headers.map((h) => h.trim().toLowerCase());
  const nameIdx = headerLower.findIndex((h) =>
    ["name", "area", "area name", "areaname"].includes(h),
  );
  if (nameIdx >= 0) {
    const key = headers[nameIdx] ?? "";
    return rows
      .map((r) => String(r[key] ?? "").trim())
      .filter(Boolean);
  }

  if (headers.length === 1) {
    const key = headers[0] ?? "";
    return rows
      .map((r) => String(r[key] ?? "").trim())
      .filter(Boolean);
  }

  return parseAreaNamesList(raw);
}

export function parseBool(value: string): boolean | undefined {
  const v = String(value ?? "").trim().toLowerCase();
  if (!v) return undefined;
  if (["1", "true", "yes", "y", "on"].includes(v)) return true;
  if (["0", "false", "no", "n", "off"].includes(v)) return false;
  return undefined;
}

export function parseNumber(value: string): number | undefined {
  const v = String(value ?? "").trim();
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

