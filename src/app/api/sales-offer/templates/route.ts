  import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import EmailTemplates, { SALES_EMAIL_TEMPLATE_TYPES } from "@/models/emailTemplate";
import Employees from "@/models/employee";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { OrganizationZod } from "@/util/organizationConstants";

const TemplateTypeZod = z.enum(SALES_EMAIL_TEMPLATE_TYPES);

const ALLOWED_MANAGER_ROLES = new Set(["SuperAdmin", "Admin", "HAdmin"]);

function canManageTemplates(role: string): boolean {
  return ALLOWED_MANAGER_ROLES.has(role);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeTemplateHtml(input: string): string {
  const content = input.trim();
  const hasHtmlTag = /<\/?[a-z][\s\S]*>/i.test(content);
  if (hasHtmlTag) return input;
  const escaped = escapeHtml(input);
  return `<div style="white-space: pre-line;">${escaped}</div>`;
}

const QuerySchema = z.object({
  organization: OrganizationZod.optional(),
  type: TemplateTypeZod.optional(),
  activeOnly: z
    .string()
    .optional()
    .transform((v) => v === "true"),
});

const UpsertSchema = z.object({
  organization: OrganizationZod,
  type: TemplateTypeZod,
  name: z.string().min(1),
  subject: z.string().min(1),
  html: z.string().min(1),
  isActive: z.boolean().optional().default(true),
});

export async function GET(req: NextRequest) {
  try {
    const payload = await getDataFromToken(req);
    await connectDb();

    const parsed = QuerySchema.safeParse(
      Object.fromEntries(req.nextUrl.searchParams.entries()),
    );
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query params" }, { status: 400 });
    }

    const role = String((payload as { role?: string }).role ?? "").trim();
    const employeeId = String((payload as { id?: string }).id ?? "");
    const employee = employeeId ? await Employees.findById(employeeId).select("organization").lean() : null;
    const employeeOrg = employee ? String((employee as { organization?: string }).organization ?? "") : "";

    const organization =
      parsed.data.organization ??
      (employeeOrg && OrganizationZod.safeParse(employeeOrg).success
        ? (employeeOrg as z.infer<typeof OrganizationZod>)
        : undefined);
    if (!organization) {
      return NextResponse.json({ error: "Organization is required" }, { status: 400 });
    }

    if (!canManageTemplates(role) && organization !== employeeOrg) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const query: Record<string, unknown> = { organization };
    if (parsed.data.type) query.type = parsed.data.type;
    if (parsed.data.activeOnly) query.isActive = true;

    const templatesRaw = await EmailTemplates.find(query).sort({ updatedAt: -1 }).lean();
    const templates = templatesRaw.map((template) => ({
      ...template,
      html: normalizeTemplateHtml(String((template as { html?: string }).html ?? "")),
    }));
    return NextResponse.json({ templates }, { status: 200 });
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

export async function POST(req: NextRequest) {
  try {
    const payload = await getDataFromToken(req);
    const role = String((payload as { role?: string }).role ?? "").trim();
    if (!canManageTemplates(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDb();
    const body = UpsertSchema.safeParse(await req.json());
    if (!body.success) {
      return NextResponse.json({ error: "Invalid body", details: body.error.flatten() }, { status: 400 });
    }

    const template = await EmailTemplates.findOneAndUpdate(
      { organization: body.data.organization, type: body.data.type },
      {
        $set: {
          organization: body.data.organization,
          type: body.data.type,
          name: body.data.name,
          subject: body.data.subject,
          html: normalizeTemplateHtml(body.data.html),
          isActive: body.data.isActive,
        },
      },
      { upsert: true, new: true },
    ).lean();

    return NextResponse.json({ template }, { status: 200 });
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

