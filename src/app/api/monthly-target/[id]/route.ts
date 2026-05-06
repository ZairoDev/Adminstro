import { MonthlyPerformanceTarget } from "@/models/monthlyPerformanceTarget";
import { connectDb } from "@/util/db";
import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { z } from "zod";

connectDb();

const ALLOWED_ROLES = ["SuperAdmin", "Sales-TeamLead"];

const updateTargetSchema = z.object({
  leads: z.number().int().min(0).optional(),
  visits: z.number().int().min(0).optional(),
  sales: z.number().int().min(0).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: "At least one field (leads, visits, or sales) must be provided.",
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tokenData = await getDataFromToken(req);
    const role = tokenData.role as string;

    if (!ALLOWED_ROLES.includes(role)) {
      return NextResponse.json(
        { error: "You do not have permission to update monthly targets." },
        { status: 403 }
      );
    }

    const { id } = await params;

    if (!id || !/^[a-f\d]{24}$/i.test(id)) {
      return NextResponse.json({ error: "Invalid target ID." }, { status: 400 });
    }

    const body = await req.json();

    const parsed = updateTargetSchema.safeParse({
      ...(body.leads !== undefined && { leads: Number(body.leads) }),
      ...(body.visits !== undefined && { visits: Number(body.visits) }),
      ...(body.sales !== undefined && { sales: Number(body.sales) }),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const updated = await MonthlyPerformanceTarget.findByIdAndUpdate(
      id,
      { $set: parsed.data },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return NextResponse.json({ error: "Target not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, target: updated }, { status: 200 });
  } catch (err: unknown) {
    const error = err as { status?: number; code?: string };

    if (error?.status) {
      return NextResponse.json(
        { code: error.code || "AUTH_FAILED" },
        { status: error.status }
      );
    }

    console.error("Error in PUT /api/monthly-target/[id]:", err);
    return NextResponse.json(
      { error: "Unable to update monthly target" },
      { status: 500 }
    );
  }
}
