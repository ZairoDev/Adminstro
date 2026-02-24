import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import RetargetContact from "@/models/retargetContact";
import * as XLSX from "xlsx";

connectDb();

/**
 * Normalize a phone number to digits only.
 * Strips non-digit chars, leading zeros after country code, etc.
 */
function normalizePhone(raw: string): string {
  if (!raw) return "";
  // Remove all non-digit characters
  let digits = String(raw).replace(/\D/g, "");
  // Remove leading zeros (e.g. 0091... -> 91...)
  digits = digits.replace(/^0+/, "");
  return digits;
}

/**
 * Generate a simple unique batch ID using timestamp + random suffix
 */
function generateBatchId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return `batch_${ts}_${rand}`;
}

export async function POST(req: NextRequest) {
  try {
    const token = await getDataFromToken(req) as any;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role check
    const allowedRoles = ["SuperAdmin", "Sales", "Advert"];
    if (!allowedRoles.includes(token.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const convertToOwner = (formData.get("convertToOwner") || "") === "1";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const fileName = file.name || "unknown";
    const ext = fileName.split(".").pop()?.toLowerCase();

    if (!ext || !["csv", "xlsx", "xls"].includes(ext)) {
      return NextResponse.json(
        { error: "Invalid file type. Only CSV, XLSX, and XLS are supported." },
        { status: 400 }
      );
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse with xlsx (handles both CSV and XLSX/XLS)
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return NextResponse.json({ error: "File contains no sheets" }, { status: 400 });
    }

    const sheet = workbook.Sheets[sheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    if (rows.length === 0) {
      return NextResponse.json({ error: "File contains no data rows" }, { status: 400 });
    }

    // Detect column names (case-insensitive, flexible matching)
    const sampleKeys = Object.keys(rows[0]);
    const findCol = (candidates: string[]): string | null => {
      for (const key of sampleKeys) {
        const lower = key.toLowerCase().trim();
        if (candidates.some((c) => lower === c || lower.includes(c))) {
          return key;
        }
      }
      return null;
    };

    // Enforce strict expected headers: Country, Name, Phone No.
    const exactMatch = (pattern: RegExp) => {
      for (const key of sampleKeys) {
        if (pattern.test(key.trim())) return key;
      }
      return null;
    };

    const nameCol = exactMatch(/^name$/i) || findCol(["name", "contact name", "full name", "fullname"]);
    const phoneCol = exactMatch(/^(phone\s*no\.?|phone\s*number|phone)$/i) || findCol(["phone", "phonenumber", "phone number", "mobile", "whatsapp", "number", "phone_number"]);
    const countryCol = exactMatch(/^country$/i) || findCol(["country", "country code", "countrycode", "country_code"]);

    // If strict headers not present, reject with clear error so frontend can toast
    if (!nameCol || !phoneCol || !countryCol) {
      return NextResponse.json(
        { error: "Invalid file format. Expected headers: Country, Name, Phone No." },
        { status: 400 }
      );
    }

    if (!phoneCol) {
      return NextResponse.json(
        { error: `Could not find a phone number column. Found columns: ${sampleKeys.join(", ")}` },
        { status: 400 }
      );
    }

    const batchId = generateBatchId();
    const uploadedBy = token.name || token.id || "unknown";
    const uploadedAt = new Date();

    const validContacts: any[] = [];
    const errors: string[] = [];
    const seenPhones = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 for header row + 1-indexed

      const rawPhone = String(row[phoneCol] || "").trim();
      const rawName = nameCol ? String(row[nameCol] || "").trim() : "";
      const rawCountry = countryCol ? String(row[countryCol] || "").trim() : "";

      // If phone is in format "+48 952563214", extract country code before the space
      let extractedCountryCode: string | null = null;
      let phoneToNormalize = rawPhone;
      const plusMatch = rawPhone.match(/^\+(\d+)\s+(.+)$/);
      if (plusMatch) {
        extractedCountryCode = plusMatch[1]; // e.g. "48"
        phoneToNormalize = plusMatch[2]; // rest of the number
      }

      if (!rawPhone) {
        errors.push(`Row ${rowNum}: Missing phone number`);
        continue;
      }

      const localDigits = normalizePhone(phoneToNormalize);
      const phone = extractedCountryCode ? `${extractedCountryCode}${localDigits}` : normalizePhone(rawPhone);

      // Basic validation: at least 7 digits, max 15
      if (phone.length < 7 || phone.length > 15) {
        errors.push(`Row ${rowNum}: Invalid phone "${rawPhone}" (${phone.length} digits)`);
        continue;
      }

      // Skip duplicates within the same file
      if (seenPhones.has(phone)) {
        errors.push(`Row ${rowNum}: Duplicate phone "${rawPhone}"`);
        continue;
      }
      seenPhones.add(phone);

      const contactObj: any = {
        name: rawName || "Contact",
        phoneNumber: phone,
        country: rawCountry || (extractedCountryCode ? `+${extractedCountryCode}` : "Unknown"),
        countryCode: extractedCountryCode ? extractedCountryCode : undefined,
        uploadedBy,
        uploadedAt,
        sourceFileName: fileName,
        batchId,
        isActive: true,
      };
      if (convertToOwner) {
        contactObj.role = "owner";
      }
      validContacts.push(contactObj);
    }

    if (validContacts.length === 0) {
      return NextResponse.json(
        {
          error: "No valid contacts found in file",
          details: errors.slice(0, 20),
        },
        { status: 400 }
      );
    }

    // Batch insert
    const inserted = await RetargetContact.insertMany(validContacts, { ordered: false });

    return NextResponse.json({
      success: true,
      batchId,
      totalRows: rows.length,
      imported: inserted.length,
      skipped: rows.length - validContacts.length,
      errors: errors.slice(0, 20),
    });
  } catch (error: any) {
    console.error("Retarget upload error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload contacts" },
      { status: 500 }
    );
  }
}
