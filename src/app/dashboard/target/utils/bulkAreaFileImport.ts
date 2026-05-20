import * as XLSX from "xlsx";

const ALLOWED_EXT = new Set(["csv", "xlsx", "xls"]);

/**
 * Reads CSV as UTF-8 text, or the first sheet of an Excel workbook as CSV
 * (so downstream parsing matches the existing paste/CSV pipeline).
 */
export async function readSpreadsheetFileAsCsvText(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_EXT.has(ext)) {
    throw new Error("Unsupported file type. Use .csv, .xlsx, or .xls");
  }

  if (ext === "csv") {
    return await file.text();
  }

  const buf = await file.arrayBuffer();
  const workbook = XLSX.read(buf, { type: "array" });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) {
    return "";
  }
  const worksheet = workbook.Sheets[firstSheet];
  return XLSX.utils.sheet_to_csv(worksheet);
}
