import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import EmailTemplates, {
  SALES_EMAIL_TEMPLATE_CATEGORIES,
  SALES_EMAIL_TEMPLATE_TYPES,
} from "@/models/emailTemplate";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { OrganizationZod } from "@/util/organizationConstants";

const TemplateTypeZod = z.enum(SALES_EMAIL_TEMPLATE_TYPES);
const TemplateCategoryZod = z.enum(SALES_EMAIL_TEMPLATE_CATEGORIES);
const ALLOWED_MANAGER_ROLES = new Set(["SuperAdmin", "Admin", "HAdmin"]);

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

const ParamsSchema = z.object({
  id: z.string().min(1),
});

const PatchSchema = z.object({
  name: z.string().min(1).optional(),
  displayName: z.string().min(1).optional(),
  subject: z.string().min(1).optional(),
  html: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  organization: OrganizationZod.optional(),
  category: TemplateCategoryZod.optional(),
  type: TemplateTypeZod.optional(),
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const payload = await getDataFromToken(req);
    const role = String((payload as { role?: string }).role ?? "").trim();
    if (!ALLOWED_MANAGER_ROLES.has(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDb();
    const { id } = ParamsSchema.parse(await ctx.params);
    const body = PatchSchema.safeParse(await req.json());
    if (!body.success) {
      return NextResponse.json({ error: "Invalid body", details: body.error.flatten() }, { status: 400 });
    }

    const updatePayload = {
      ...body.data, 
      ...(body.data.html ? { html: normalizeTemplateHtml(body.data.html) } : {}),
    };

    const updated = await EmailTemplates.findByIdAndUpdate(id, updatePayload, {
      new: true,
    }).lean();
    if (!updated) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json({ template: updated }, { status: 200 });
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

