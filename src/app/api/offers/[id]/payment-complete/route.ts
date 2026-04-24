import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { Offer } from "@/models/offer";
import Employees from "@/models/employee";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { OrganizationZod } from "@/util/organizationConstants";

const ParamsSchema = z.object({ id: z.string().min(1) });
const BodySchema = z.object({
  organization: OrganizationZod.optional(),
  note: z.string().optional().default(""),
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
    const historyEntry = {
      type: "offer",
      status: "payment_complete",
      note: body.data.note || "Payment marked complete",
      updatedBy: employeeId,
      updatedByName: employeeName,
      createdAt: new Date(),
    };

    let offer = await Offer.findOneAndUpdate(
      { _id: id, organization: org },
      {
        $set: {
          offerStatus: "Accepted",
          leadStatus: "Send Offer",
        },
        $push: { history: historyEntry },
      },
      { new: true },
    ).lean();

    if (!offer) {
      offer = await Offer.findOneAndUpdate(
        { _id: id },
        {
          $set: {
            offerStatus: "Accepted",
            leadStatus: "Send Offer",
          },
          $push: { history: historyEntry },
        },
        { new: true },
      ).lean();
    }

    if (!offer) return NextResponse.json({ error: "Offer not found" }, { status: 404 });
    return NextResponse.json({ offer }, { status: 200 });
  } catch (err: unknown) {
    const error = err as { status?: number; code?: string; message?: string };
    if (error?.status) {
      return NextResponse.json({ code: error.code || "AUTH_FAILED" }, { status: error.status });
    }
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

