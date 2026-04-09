import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { Offer } from "@/models/offer";
import Employees from "@/models/employee";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";

const BodySchema = z.object({
  leadIds: z.array(z.string().min(1)).min(1),
  employeeId: z.string().min(1),
});

export async function PATCH(req: NextRequest) {
  try {
    const token = (await getDataFromToken(req)) as any;
    const requesterId = String(token?.id ?? "");
    const role = String(token?.role ?? "").trim();

    if (!requesterId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["SuperAdmin", "HAdmin", "Admin"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

    await connectDb();

    const requester = await Employees.findById(requesterId).select("organization").lean();
    const organization = requester ? String((requester as any).organization ?? "") : "";
    if (!organization) return NextResponse.json({ error: "Organization is required" }, { status: 400 });

    const targetEmp = await Employees.findById(parsed.data.employeeId).select("organization").lean();
    const targetOrg = targetEmp ? String((targetEmp as any).organization ?? "") : "";
    if (!targetEmp) return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    if (targetOrg !== organization) {
      return NextResponse.json({ error: "Cross-organization assignment not allowed" }, { status: 400 });
    }

    const res = await Offer.updateMany(
      { _id: { $in: parsed.data.leadIds }, organization, leadStage: { $in: ["pending", "assigned"] } },
      { $set: { assignedTo: parsed.data.employeeId, leadStage: "assigned" } },
    );

    return NextResponse.json({ matched: res.matchedCount, modified: res.modifiedCount }, { status: 200 });
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

