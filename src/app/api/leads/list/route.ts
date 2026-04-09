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
  leadStage: z.enum(["pending", "assigned", "claimed", "converted", "rejected"]).optional(),
  assignedTo: z.string().optional(),
  mine: z
    .string()
    .optional()
    .transform((v) => v === "true"),
});

export async function GET(req: NextRequest) {
  try {
    const payload = await getDataFromToken(req);
    const employeeId = String((payload as any).id ?? "");
    if (!employeeId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDb();

    const parsed = QuerySchema.safeParse(
      Object.fromEntries(req.nextUrl.searchParams.entries()),
    );
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query params" }, { status: 400 });
    }

    const employee = await Employees.findById(employeeId).select("organization role").lean();
    const defaultOrg = employee ? String((employee as any).organization ?? "") : "";

    const org = parsed.data.organization ?? (defaultOrg || undefined);
    if (!org) return NextResponse.json({ error: "Organization is required" }, { status: 400 });

    const role = String((employee as any)?.role ?? "").trim();
    const isAdmin = ["SuperAdmin", "HAdmin", "Admin"].includes(role);

    const page = Number.isFinite(parsed.data.page) ? Math.max(1, parsed.data.page) : 1;
    const pageSize = Number.isFinite(parsed.data.pageSize)
      ? Math.min(100, Math.max(1, parsed.data.pageSize))
      : 20;
    const skip = (page - 1) * pageSize;

    const query: Record<string, unknown> = { organization: org };
    if (parsed.data.leadStage) query.leadStage = parsed.data.leadStage;

    if (parsed.data.mine) {
      query.assignedTo = employeeId;
    } else if (!isAdmin) {
      if (parsed.data.leadStage === "pending") {
        query.assignedTo = null;
      } else {
        query.assignedTo = employeeId;
      }
    } else if (parsed.data.assignedTo) {
      query.assignedTo = parsed.data.assignedTo;
    }

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

