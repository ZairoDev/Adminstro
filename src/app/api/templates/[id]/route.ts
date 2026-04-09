import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import EmailTemplates from "@/models/emailTemplate";
import { getDataFromToken } from "@/util/getDataFromToken";
import { connectDb } from "@/util/db";
import { OrganizationZod } from "@/util/organizationConstants";

const ParamsSchema = z.object({
  id: z.string().min(1),
});

const PatchSchema = z.object({
  name: z.string().min(1).optional(),
  html: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  organization: OrganizationZod.optional(), // allow admin to move template if needed
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await getDataFromToken(req);
    await connectDb();

    const { id } = ParamsSchema.parse(await ctx.params);
    const body = PatchSchema.safeParse(await req.json());
    if (!body.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const updated = await EmailTemplates.findByIdAndUpdate(id, body.data, {
      new: true,
    }).lean();

    if (!updated) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json({ template: updated }, { status: 200 });
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

