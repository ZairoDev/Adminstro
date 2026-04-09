import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { Offer } from "@/models/offer";
import Employees from "@/models/employee";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { OrganizationZod } from "@/util/organizationConstants";

const QuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : 1)),
  pageSize: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : 20)),
  organization: OrganizationZod.optional(),
  leadStatus: z.string().optional(),
  offerStatus: z.string().optional(),
  employeeId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const payload = await getDataFromToken(req);
    const tokenEmployeeId = (payload as any).id as string;

    await connectDb();

    const parsed = QuerySchema.safeParse(
      Object.fromEntries(req.nextUrl.searchParams.entries()),
    );
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query params" }, { status: 400 });
    }

    const employee = await Employees.findById(tokenEmployeeId).lean();
    const defaultOrg = employee ? (employee as any).organization : undefined;

    const org = parsed.data.organization ?? defaultOrg;
    if (!org) {
      return NextResponse.json({ error: "Organization is required" }, { status: 400 });
    }

    const page = Number.isFinite(parsed.data.page) ? Math.max(1, parsed.data.page) : 1;
    const pageSize = Number.isFinite(parsed.data.pageSize)
      ? Math.min(100, Math.max(1, parsed.data.pageSize))
      : 20;

    const query: Record<string, unknown> = { organization: org };
    if (parsed.data.leadStatus) query.leadStatus = parsed.data.leadStatus;
    if (parsed.data.offerStatus) query.offerStatus = parsed.data.offerStatus;
    if (parsed.data.employeeId) query.sentByEmployee = parsed.data.employeeId;

    const skip = (page - 1) * pageSize;
    const [items, total] = await Promise.all([
      Offer.find(query).sort({ createdAt: -1 }).skip(skip).limit(pageSize).lean(),
      Offer.countDocuments(query),
    ]);
    const totalPages = Math.ceil(total / pageSize);

    return NextResponse.json({ items, total, totalPages, page, pageSize }, { status: 200 });
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

