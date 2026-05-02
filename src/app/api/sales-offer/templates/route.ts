  import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import EmailTemplates, {
  SALES_EMAIL_TEMPLATE_CATEGORIES,
  SALES_EMAIL_TEMPLATE_TYPES,
} from "@/models/emailTemplate";
import Employees from "@/models/employee";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { OrganizationZod } from "@/util/organizationConstants";

const TemplateTypeZod = z.enum(SALES_EMAIL_TEMPLATE_TYPES);
const TemplateCategoryZod = z.enum(SALES_EMAIL_TEMPLATE_CATEGORIES);

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
  category: TemplateCategoryZod.optional(),
  type: TemplateTypeZod.optional(),
  activeOnly: z
    .string()
    .optional()
    .transform((v) => v === "true"),
});

const UpsertSchema = z.object({
  templateId: z.string().optional(),
  organization: OrganizationZod,
  category: TemplateCategoryZod,
  type: TemplateTypeZod.optional(),
  name: z.string().min(1),
  displayName: z.string().min(1),
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
    if (parsed.data.category === "REMINDER") {
      query.$or = [{ category: "REMINDER" }, { type: { $in: ["REM1", "REM2", "REM3", "REM4"] } }];
    } else if (parsed.data.category === "REBUTTAL") {
      query.$or = [{ category: "REBUTTAL" }, { type: { $in: ["REBUTTAL1", "REBUTTAL2"] } }];
    } else if (parsed.data.category === "OFFER") {
      query.$or = [{ category: "OFFER" }, { type: "OFFER" }, { type: { $exists: false } }];
    }
    if (parsed.data.type) query.type = parsed.data.type;
    if (parsed.data.activeOnly) query.isActive = true;

    const templatesRaw = await EmailTemplates.find(query).sort({ updatedAt: -1 }).lean();
    const templates = templatesRaw.map((template) => ({
      ...template,
      html: normalizeTemplateHtml(String((template as { html?: string }).html ?? "")),
    }));
    return NextResponse.json({ templates }, { status: 200 });
  } catch (err: unknown) {
    const error = err as { status?: number; code?: string | number; message?: string };
    if (error?.code === 11000) {
      return NextResponse.json(
        {
          error:
            "Template key/sequence already exists for this organization and category. Use a different name or sequence order.",
        },
        { status: 409 },
      );
    }
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

    const templatePayload = {
      organization: body.data.organization,
      category: body.data.category,
      type: body.data.type,
      name: body.data.name,
      displayName: body.data.displayName,
      subject: body.data.subject,
      html: normalizeTemplateHtml(body.data.html),
      sequenceOrder: null,
      isActive: body.data.isActive,
    };

    const template = body.data.templateId
      ? await EmailTemplates.findByIdAndUpdate(
          body.data.templateId,
          { $set: templatePayload },
          { new: true },
        ).lean()
      : await EmailTemplates.create(templatePayload);

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

