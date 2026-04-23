import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { Offer } from "@/models/offer";
import Employees from "@/models/employee";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";

const ParamsSchema = z.object({ id: z.string().min(1) });

const BodySchema = z.object({
  date: z.string().min(1, "Date is required"),
  time: z.string().optional().default(""),
  note: z.string().optional().default(""),
});

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const payload = await getDataFromToken(req);
    const employeeId = (payload as any).id as string;

    const body = BodySchema.safeParse(await req.json());
    if (!body.success) {
      return NextResponse.json({ error: "Invalid body", details: body.error.flatten() }, { status: 400 });
    }

    await connectDb();

    const employee = await Employees.findById(employeeId).lean();
    const org = employee ? (employee as any).organization : undefined;
    const employeeName: string = employee ? ((employee as any).name ?? "") : "";
    if (!org) return NextResponse.json({ error: "Organization is required" }, { status: 400 });

    const { id } = ParamsSchema.parse(await ctx.params);

    const existing = await Offer.findOne({ _id: id, organization: org }).select("callbacks").lean();
    if (!existing) return NextResponse.json({ error: "Offer not found" }, { status: 404 });

    const existingCallbacks = (existing as any).callbacks ?? [];
    const callbackNo = existingCallbacks.length + 1;
    const callbackEntry = {
      callbackNo,
      date: new Date(body.data.date),
      time: body.data.time,
      note: body.data.note,
      createdBy: employeeId,
      createdByName: employeeName,
      createdAt: new Date(),
    };

    const historyEntry = {
      type: "callback",
      status: `Callback ${callbackNo}`,
      note: body.data.note,
      updatedBy: employeeId,
      updatedByName: employeeName,
      createdAt: new Date(),
    };

    const offer = await Offer.findOneAndUpdate(
      { _id: id, organization: org },
      {
        $push: { callbacks: callbackEntry, history: historyEntry },
        $set: { leadStatus: "Call Back" },
      },
      { new: true },
    ).lean();

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
