import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { z } from "zod";

import { Offer } from "@/models/offer";
import Employees from "@/models/employee";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { OrganizationZod, type Organization } from "@/util/organizationConstants";

const AllowedRoles = ["SuperAdmin", "HAdmin", "Admin"] as const;

const RowSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  phoneNumber: z.string().min(1),
  propertyLink: z.string().optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  country: z.string().optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  city: z.string().optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
});

function normalizeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizePhone(raw: string): string {
  if (!raw) return "";
  let digits = String(raw).replace(/\D/g, "");
  digits = digits.replace(/^0+/, "");
  return digits ? `+${digits}` : "";
}

export async function POST(req: NextRequest) {
  try {
    const token = (await getDataFromToken(req)) as any;
    const employeeId = String(token?.id ?? "");
    const role = String(token?.role ?? "").trim();

    if (!employeeId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!AllowedRoles.includes(role as (typeof AllowedRoles)[number])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDb();

    const employee = await Employees.findById(employeeId).select("organization").lean();
    const orgRaw = employee ? String((employee as any).organization ?? "") : "";
    const orgParsed = OrganizationZod.safeParse(orgRaw);
    if (!orgParsed.success) {
      return NextResponse.json({ error: "Organization is required" }, { status: 400 });
    }
    const organization = orgParsed.data as Organization;

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const fileName = file.name || "upload";
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (!ext || !["csv", "xlsx", "xls"].includes(ext)) {
      return NextResponse.json(
        { error: "Invalid file type. Only CSV, XLSX, and XLS are supported." },
        { status: 400 },
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const workbook =
      ext === "csv"
        ? XLSX.read(buf, { type: "buffer", raw: true, codepage: 65001 })
        : XLSX.read(buf, { type: "buffer" });

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return NextResponse.json({ error: "No sheet found" }, { status: 400 });
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

    const errors: Array<{ row: number; reason: string }> = [];
    const docs: Array<Record<string, unknown>> = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i] ?? {};
      const parsed = RowSchema.safeParse({
        name: normalizeCell(r.name ?? r.Name ?? r.fullName ?? r["Full Name"]),
        email: normalizeCell(r.email ?? r.Email),
        phoneNumber: normalizeCell(r.phoneNumber ?? r.PhoneNumber ?? r.phone ?? r.Phone),
        propertyLink: normalizeCell(r.propertyLink ?? r.PropertyLink ?? r.propertyUrl ?? r.PropertyUrl),
        country: normalizeCell(r.country ?? r.Country),
        city: normalizeCell(r.city ?? r.City),
      });

      if (!parsed.success) {
        errors.push({ row: i + 2, reason: "Invalid row format" });
        continue;
      }

      const phone = normalizePhone(parsed.data.phoneNumber);
      if (!phone) {
        errors.push({ row: i + 2, reason: "Invalid phoneNumber" });
        continue;
      }

      // Offer model requires many fields; create a minimal lead-like Offer doc
      docs.push({
        phoneNumber: phone,
        leadStatus: "Call Back",
        note: "",
        name: parsed.data.name,
        propertyName: parsed.data.name,
        relation: "Owner",
        email: parsed.data.email ?? "unknown@example.com",
        propertyUrl: parsed.data.propertyLink ?? "-",
        country: parsed.data.country ?? "Unknown",
        state: "",
        city: parsed.data.city ?? "",
        plan: "-",
        discount: 0,
        effectivePrice: 0,
        expiryDate: null,
        services: "",
        platform: organization,
        availableOn: [],
        organization,
        leadStage: "pending",
        source: "excel_import",
        uploadedBy: employeeId,
        assignedTo: null,
        claimedAt: null,
        offerStatus: "Draft",
      });
    }

    const total = rows.length;
    if (docs.length === 0) {
      return NextResponse.json(
        { total, success: 0, failed: total, errors },
        { status: 200 },
      );
    }

    const inserted = await Offer.insertMany(docs, { ordered: false });

    return NextResponse.json(
      {
        total,
        success: inserted.length,
        failed: total - inserted.length,
        errors,
      },
      { status: 200 },
    );
  } catch (err: unknown) {
    const error = err as { status?: number; code?: string; message?: string };
    if (error?.status) {
      return NextResponse.json({ code: error.code || "AUTH_FAILED" }, { status: error.status });
    }
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}

