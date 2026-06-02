import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  buildNotLiveQuery,
  buildPropertyListQuery,
} from "@/lib/holidaysera/property-query";
import { Properties } from "@/models/property";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";

connectDb();

const ALLOWED_ROLES = new Set(["SuperAdmin", "HAdmin", "Advert"]);

const QuerySchema = z.object({
  searchTerm: z.string().trim().optional().default(""),
  searchType: z.string().trim().optional().default("VSID"),
  holidayseraOnly: z
    .enum(["true", "false"])
    .optional()
    .default("false")
    .transform((value) => value === "true"),
});

const BodySchema = z.object({
  searchTerm: z.string().trim().optional().default(""),
  searchType: z.string().trim().optional().default("VSID"),
  holidayseraOnly: z.boolean().optional().default(false),
});

async function assertCanChangeVisibility(
  req: NextRequest,
): Promise<{ role: string } | NextResponse> {
  const token = (await getDataFromToken(req)) as { role?: string } | null;
  if (!token?.role || !ALLOWED_ROLES.has(token.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  return { role: token.role };
}

export async function GET(req: NextRequest) {
  try {
    const auth = await assertCanChangeVisibility(req);
    if (auth instanceof NextResponse) return auth;

    const parsed = QuerySchema.safeParse({
      searchTerm: req.nextUrl.searchParams.get("searchTerm") ?? "",
      searchType: req.nextUrl.searchParams.get("searchType") ?? "VSID",
      holidayseraOnly: req.nextUrl.searchParams.get("holidayseraOnly") ?? "false",
    });

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid query", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const { searchTerm, searchType, holidayseraOnly } = parsed.data;
    const baseQuery = buildPropertyListQuery(searchTerm, searchType, holidayseraOnly);
    const query = buildNotLiveQuery(baseQuery);
    const count = await Properties.countDocuments(query);

    return NextResponse.json({ count });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to count not-live properties:", error);
    return NextResponse.json(
      { message: "Failed to count properties", error: message },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await assertCanChangeVisibility(req);
    if (auth instanceof NextResponse) return auth;

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid body", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const { searchTerm, searchType, holidayseraOnly } = parsed.data;
    const baseQuery = buildPropertyListQuery(searchTerm, searchType, holidayseraOnly);
    const query = buildNotLiveQuery(baseQuery);

    const result = await Properties.updateMany(query, {
      $set: { isLive: true },
    });

    return NextResponse.json({
      message: "Properties made live",
      modifiedCount: result.modifiedCount ?? 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to make properties live:", error);
    return NextResponse.json(
      { message: "Failed to make properties live", error: message },
      { status: 500 },
    );
  }
}
