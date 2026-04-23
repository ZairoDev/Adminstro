import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { Offer } from "@/models/offer";
import Employees from "@/models/employee";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { OrganizationZod } from "@/util/organizationConstants";

const ParamsSchema = z.object({ id: z.string().min(1) });

const BodySchema = z.object({
  note: z.string().optional().default(""),
  organization: OrganizationZod.optional(),
});

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const payload = await getDataFromToken(req);
    const employeeId = (payload as any).id as string;

    const body = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!body.success) {
      return NextResponse.json({ error: "Invalid body", details: body.error.flatten() }, { status: 400 });
    }

    await connectDb();

    const employee = await Employees.findById(employeeId).lean();
    const employeeOrg = employee ? (employee as any).organization : undefined;
    const org = body.data.organization ?? employeeOrg;
    const employeeName: string = employee ? ((employee as any).name ?? "") : "";
    if (!org) return NextResponse.json({ error: "Organization is required" }, { status: 400 });

    const { id } = ParamsSchema.parse(await ctx.params);
    const now = new Date();

    const historyEntry = {
      type: "lead",
      status: "Reverted to Pending",
      note: body.data.note || "Moved back to pending leads",
      updatedBy: employeeId,
      updatedByName: employeeName,
      createdAt: now,
    };

    let offer = await Offer.findOneAndUpdate(
      {
        _id: id,
        organization: org,
        leadStatus: { $in: ["Reject Lead", "Blacklist Lead"] },
      },
      {
        $set: {
          leadStatus: "Not Connected",
          rejectionReason: "",
          rejectedAt: null,
          blacklistReason: "",
          blacklistedAt: null,
        },
        $push: { history: historyEntry },
      },
      { new: true },
    ).lean();

    if (!offer) {
      // Legacy records can have missing/old organization values.
      offer = await Offer.findOneAndUpdate(
        {
          _id: id,
          leadStatus: { $in: ["Reject Lead", "Blacklist Lead"] },
        },
        {
          $set: {
            leadStatus: "Not Connected",
            rejectionReason: "",
            rejectedAt: null,
            blacklistReason: "",
            blacklistedAt: null,
          },
          $push: { history: historyEntry },
        },
        { new: true },
      ).lean();
    }

    if (!offer) {
      return NextResponse.json({ error: "Offer not found or not in rejected/blacklisted state" }, { status: 404 });
    }

    return NextResponse.json({ offer }, { status: 200 });
  } catch (err: unknown) {
    const error = err as { status?: number; code?: string; message?: string };
    if (error?.status) {
      return NextResponse.json({ code: error.code || "AUTH_FAILED" }, { status: error.status });
    }
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

