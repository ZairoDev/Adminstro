import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { Properties } from "@/models/property";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";

connectDb();

const ALLOWED_ROLES = new Set(["SuperAdmin", "Advert"]);

const BodySchema = z.object({
  searchTerm: z.string().trim().optional().default(""),
  searchType: z.string().trim().optional().default("VSID"),
  holidayseraOnly: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  try {
    const token = (await getDataFromToken(req)) as { role?: string } | null;
    if (!token?.role || !ALLOWED_ROLES.has(token.role)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid body", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const { searchTerm, searchType, holidayseraOnly } = parsed.data;

    const query: Record<string, unknown> = {
      origin: holidayseraOnly
        ? { $in: [/holidaysera/i] }
        : { $in: [/holidaysera/i, /housingsaga/i] },
      approvalStatus: "approved",
      $or: [
        { isLive: false },
        { isLive: { $exists: false } },
        { isLive: null },
      ],
    };

    if (searchTerm) {
      query[searchType] = new RegExp(searchTerm, "i");
    }

    const result = await Properties.updateMany(query, {
      $set: { isLive: true },
    });

    return NextResponse.json({
      message: "Approved Holidaysera/HousingSaga properties made live",
      modifiedCount: result.modifiedCount ?? 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to make Holidaysera properties live:", error);
    return NextResponse.json(
      { message: "Failed to make properties live", error: message },
      { status: 500 },
    );
  }
}

