import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { Offer } from "@/models/offer";
import Employees from "@/models/employee";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";

const ParamsSchema = z.object({
  id: z.string().min(1),
});

const BodySchema = z.object({
  type: z.enum(["lead", "offer"]),
  status: z.string().min(1),
  note: z.string().optional().default(""),
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const payload = await getDataFromToken(req);
    const employeeId = (payload as any).id as string;

    const body = BodySchema.safeParse(await req.json());
    if (!body.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    await connectDb();

    const employee = await Employees.findById(employeeId).lean();
    const org = employee ? (employee as any).organization : undefined;
    if (!org) return NextResponse.json({ error: "Organization is required" }, { status: 400 });

    const { id } = ParamsSchema.parse(await ctx.params);

    const update: Record<string, unknown> = {
      $push: {
        history: {
          type: body.data.type,
          status: body.data.status,
          note: body.data.note,
          updatedBy: employeeId,
        },
      },
    };
    if (body.data.type === "lead") {
      update.$set = { leadStatus: body.data.status };
    } else {
      update.$set = { offerStatus: body.data.status };
    }

    const offer = await Offer.findOneAndUpdate({ _id: id, organization: org }, update, {
      new: true,
    }).lean();
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

