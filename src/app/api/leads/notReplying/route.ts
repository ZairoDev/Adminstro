import { NextRequest, NextResponse } from "next/server";

import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { LeadQueryService } from "@/lib/leads/LeadQueryService";
import { buildNotReplyingMatchQuery } from "@/lib/leads/buildAllLeadsMatchQuery";

connectDb();

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const token = await getDataFromToken(req);
    const reqBody = await req.json();
    const PAGE = reqBody.page ?? 1;
    const filters = reqBody.filters ?? {};

    const buildResult = await buildNotReplyingMatchQuery({
      token: token as Record<string, unknown>,
      filters,
    });

    if (!buildResult.ok) {
      return NextResponse.json(buildResult.emptyResponse);
    }

    const result = await LeadQueryService.list({
      matchQuery: buildResult.query,
      page: PAGE,
      sortBy: filters.sortBy,
      includeStatusCount: true,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const err = error as { status?: number; code?: string; message?: string };
    if (err?.status === 401 || err?.code) {
      return NextResponse.json(
        { code: err.code || "AUTH_FAILED" },
        { status: err.status || 401 },
      );
    }
    console.error("Error in notReplying leads:", error);
    return NextResponse.json(
      {
        message: "Failed to fetch not replying leads",
        error: err?.message,
      },
      { status: 500 },
    );
  }
}
