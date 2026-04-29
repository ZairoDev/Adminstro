import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import EmailTemplates, { SALES_EMAIL_TEMPLATE_TYPES } from "@/models/emailTemplate";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import { OrganizationZod } from "@/util/organizationConstants";
import Employees from "@/models/employee";

const QuerySchema = z.object({
  organization: OrganizationZod.optional(),
  type: z.enum(SALES_EMAIL_TEMPLATE_TYPES).optional(),
  activeOnly: z
    .string()
    .optional()
    .transform((v) => v === "true"),
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

    const { organization, activeOnly, type } = parsed.data;

    // If organization isn’t provided, default to employee’s org from DB.
    let org = organization;
    if (!org) {
      const employeeId = (payload as any).id as string | undefined;
      if (employeeId && employeeId !== "test-superadmin") {
        const employee = await Employees.findById(employeeId).select("organization").lean();
        const employeeOrg = employee ? (employee as any).organization : undefined;
        if (employeeOrg && OrganizationZod.safeParse(employeeOrg).success) {
          org = employeeOrg as any;
        }
      }
    }

    if (!org) {
      return NextResponse.json({ error: "Organization is required" }, { status: 400 });
    }

    const query: Record<string, unknown> = { organization: org };
    if (activeOnly) query.isActive = true;
    if (type === "OFFER") {
      query.$or = [{ type: "OFFER" }, { type: { $exists: false } }];
    } else if (type) {
      query.type = type;
    }

    const templates = await EmailTemplates.find(query).sort({ updatedAt: -1 }).lean();

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

const CreateSchema = z.object({
  name: z.string().min(1),
  html: z.string().min(1),
  isActive: z.boolean().optional().default(true),
  organization: OrganizationZod,
});

export async function POST(req: NextRequest) {
  try {
    await getDataFromToken(req);
    await connectDb();

    const body = CreateSchema.safeParse(await req.json());
    if (!body.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const created = await EmailTemplates.create(body.data);
    return NextResponse.json({ template: created }, { status: 201 });
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

