import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { Offer } from "@/models/offer";
import Employees from "@/models/employee";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";

const BodySchema = z.object({
  leadId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const token = (await getDataFromToken(req)) as any;
    const employeeId = String(token?.id ?? "");
    const role = String(token?.role ?? "").trim();
    if (!employeeId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // allow all authenticated employees/sales roles to claim
    if (["Guest"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

    await connectDb();

    const employee = await Employees.findById(employeeId).select("organization").lean();
    const organization = employee ? String((employee as any).organization ?? "") : "";
    if (!organization) return NextResponse.json({ error: "Organization is required" }, { status: 400 });

    const updated = await Offer.findOneAndUpdate(
      { _id: parsed.data.leadId, organization, assignedTo: null, leadStage: "pending" },
      { $set: { assignedTo: employeeId, leadStage: "claimed", claimedAt: new Date() } },
      { new: true },
    ).lean();

    if (!updated) {
      return NextResponse.json({ error: "Lead not available to claim" }, { status: 409 });
    }

    return NextResponse.json({ lead: updated }, { status: 200 });
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

