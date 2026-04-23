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
  rejectionReason: z.string().optional(),
  blacklistReason: z.string().optional(),
  callbackDateFrom: z.string().optional(),
  callbackDateTo: z.string().optional(),
  rejectedAtFrom: z.string().optional(),
  rejectedAtTo: z.string().optional(),
  blacklistedAtFrom: z.string().optional(),
  blacklistedAtTo: z.string().optional(),
  search: z.string().optional(),
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
    if (parsed.data.rejectionReason) query.rejectionReason = parsed.data.rejectionReason;
    if (parsed.data.blacklistReason) {
      query.blacklistReason = { $regex: parsed.data.blacklistReason, $options: "i" };
    }

    if (parsed.data.search) {
      const regex = { $regex: parsed.data.search, $options: "i" };
      query.$or = [
        { name: regex },
        { email: regex },
        { phoneNumber: regex },
        { propertyName: regex },
      ];
    }

    if (parsed.data.callbackDateFrom || parsed.data.callbackDateTo) {
      const dateFilter: Record<string, Date> = {};
      if (parsed.data.callbackDateFrom) dateFilter.$gte = new Date(parsed.data.callbackDateFrom);
      if (parsed.data.callbackDateTo) dateFilter.$lte = new Date(parsed.data.callbackDateTo);
      query["callbacks.date"] = dateFilter;
    }

    if (parsed.data.rejectedAtFrom || parsed.data.rejectedAtTo) {
      const dateFilter: Record<string, Date> = {};
      if (parsed.data.rejectedAtFrom) dateFilter.$gte = new Date(parsed.data.rejectedAtFrom);
      if (parsed.data.rejectedAtTo) dateFilter.$lte = new Date(parsed.data.rejectedAtTo);
      query.rejectedAt = dateFilter;
    }

    if (parsed.data.blacklistedAtFrom || parsed.data.blacklistedAtTo) {
      const dateFilter: Record<string, Date> = {};
      if (parsed.data.blacklistedAtFrom) dateFilter.$gte = new Date(parsed.data.blacklistedAtFrom);
      if (parsed.data.blacklistedAtTo) dateFilter.$lte = new Date(parsed.data.blacklistedAtTo);
      query.blacklistedAt = dateFilter;
    }

    const skip = (page - 1) * pageSize;
    const [items, totalCount] = await Promise.all([
      Offer.find(query).sort({ createdAt: -1 }).skip(skip).limit(pageSize).lean(),
      Offer.countDocuments(query),
    ]);
    const totalPages = Math.ceil(totalCount / pageSize);

    return NextResponse.json({ data: items, items, totalCount, total: totalCount, totalPages, page, pageSize }, { status: 200 });
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
