import { MonthlyPerformanceTarget } from "@/models/monthlyPerformanceTarget";
import { normalizeCityKey, toDisplayCity } from "@/lib/city-normalizer";
import { connectDb } from "@/util/db";
import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { z } from "zod";

connectDb();

const ALLOWED_ROLES = ["SuperAdmin", "Sales-TeamLead", "LeadGen-TeamLead"];

const EDITABLE_FIELDS_BY_ROLE: Record<string, Array<"leads" | "visits" | "sales">> = {
  SuperAdmin: ["leads", "visits", "sales"],
  "LeadGen-TeamLead": ["leads"],
  "Sales-TeamLead": ["leads", "visits", "sales"],
};

const createTargetSchema = z.object({
  city: z.string().min(1, "City is required"),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020),
  leads: z.number().int().min(0),
  visits: z.number().int().min(0),
  sales: z.number().int().min(0),
});

export async function POST(req: NextRequest) {
  try {
    const tokenData = await getDataFromToken(req);
    const role = tokenData.role as string;

    if (!ALLOWED_ROLES.includes(role)) {
      return NextResponse.json(
        { error: "You do not have permission to set monthly targets." },
        { status: 403 }
      );
    }

    const body = await req.json();

    // Coerce string numbers from form submissions
    const parsed = createTargetSchema.safeParse({
      ...body,
      month: Number(body.month),
      year: Number(body.year),
      leads: Number(body.leads),
      visits: Number(body.visits),
      sales: Number(body.sales),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const city = toDisplayCity(data.city);
    const cityKey = normalizeCityKey(city);
    const editableFields = EDITABLE_FIELDS_BY_ROLE[role] ?? [];

    const existingTarget = await MonthlyPerformanceTarget.findOne({
      cityKey,
      month: data.month,
      year: data.year,
    });

    const nextValues = {
      leads: existingTarget?.leads ?? 0,
      visits: existingTarget?.visits ?? 0,
      sales: existingTarget?.sales ?? 0,
    };

    for (const field of editableFields) {
      nextValues[field] = data[field];
    }

    const target = await MonthlyPerformanceTarget.findOneAndUpdate(
      { cityKey, month: data.month, year: data.year },
      {
        $set: {
          city,
          cityKey,
          leads: nextValues.leads,
          visits: nextValues.visits,
          sales: nextValues.sales,
          createdBy: tokenData.id,
        },
        $setOnInsert: {
          month: data.month,
          year: data.year,
        },
      },
      { new: true, upsert: true, runValidators: true }
    );

    return NextResponse.json(
      { success: true, target },
      { status: existingTarget ? 200 : 201 }
    );
  } catch (err: unknown) {
    const error = err as { status?: number; code?: string; name?: string };

    if (error?.status) {
      return NextResponse.json(
        { code: error.code || "AUTH_FAILED" },
        { status: error.status }
      );
    }

    // MongoDB duplicate key error
    if (error?.code === "11000" || (error as { code?: number })?.code === 11000) {
      return NextResponse.json(
        { error: "A monthly target for this city already exists for the selected month." },
        { status: 409 }
      );
    }

    console.error("Error in POST /api/monthly-target:", err);
    return NextResponse.json(
      { error: "Unable to create monthly target" },
      { status: 500 }
    );
  }
}
