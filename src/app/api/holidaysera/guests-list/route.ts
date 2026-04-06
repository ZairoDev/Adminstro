import { NextRequest, NextResponse } from "next/server";

import {
  HOLIDAY_SERA_GUESTS_PAGE_SIZE,
  listHolidaySeraOwners,
} from "@/services/holidaySeraGuests";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";

export const dynamic = "force-dynamic";

function cacheHeaders(): HeadersInit {
  return { "Cache-Control": "private, max-age=30" };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const payload = await getDataFromToken(request);
    const role =
      typeof payload === "object" && payload !== null && "role" in payload
        ? (payload as { role?: string }).role
        : undefined;
    if (role !== "HAdmin" && role !== "SuperAdmin") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  await connectDb();

  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const search = (searchParams.get("search") || "").trim();

  const { items, total } = await listHolidaySeraOwners({ page, search });
  const totalPages = Math.ceil(total / HOLIDAY_SERA_GUESTS_PAGE_SIZE) || 1;

  return NextResponse.json(
    {
      success: true,
      users: items,
      total,
      page,
      pageSize: HOLIDAY_SERA_GUESTS_PAGE_SIZE,
      totalPages,
    },
    { headers: cacheHeaders() },
  );
}
