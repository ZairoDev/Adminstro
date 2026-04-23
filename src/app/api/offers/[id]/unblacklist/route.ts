import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { Offer } from "@/models/offer";
import Employees from "@/models/employee";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";

const ALLOWED_ROLES = ["SuperAdmin", "HAdmin", "Admin"];

const ParamsSchema = z.object({ id: z.string().min(1) });

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const payload = await getDataFromToken(req);
    const employeeId = (payload as any).id as string;
    const role: string = (payload as any).role ?? "";

    if (!ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    await connectDb();

    const employee = await Employees.findById(employeeId).lean();
    const org = employee ? (employee as any).organization : undefined;
    const employeeName: string = employee ? ((employee as any).name ?? "") : "";
    if (!org) return NextResponse.json({ error: "Organization is required" }, { status: 400 });

    const { id } = ParamsSchema.parse(await ctx.params);

    const historyEntry = {
      type: "blacklist",
      status: "Unblacklisted",
      note: "Removed from blacklist",
      updatedBy: employeeId,
      updatedByName: employeeName,
      createdAt: new Date(),
    };

    const offer = await Offer.findOneAndUpdate(
      { _id: id, organization: org, leadStatus: "Blacklist Lead" },
      {
        $set: {
          leadStatus: "Not Connected",
          blacklistReason: "",
          blacklistedAt: null,
        },
        $push: { history: historyEntry },
      },
      { new: true },
    ).lean();

    if (!offer) {
      return NextResponse.json({ error: "Offer not found or not blacklisted" }, { status: 404 });
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
