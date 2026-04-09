import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { Offer } from "@/models/offer";
import Employees from "@/models/employee";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";

const ParamsSchema = z.object({
  id: z.string().min(1),
});

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const payload = await getDataFromToken(req);
    const tokenEmployeeId = (payload as any).id as string;

    await connectDb();

    const employee = await Employees.findById(tokenEmployeeId).lean();
    const org = employee ? (employee as any).organization : undefined;
    if (!org) return NextResponse.json({ error: "Organization is required" }, { status: 400 });

    const { id } = ParamsSchema.parse(await ctx.params);

    const offer = await Offer.findOne({ _id: id, organization: org }).lean();
    if (!offer) return NextResponse.json({ error: "Offer not found" }, { status: 404 });

    return NextResponse.json({ offer }, { status: 200 });
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

