import type { PipelineStage } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  buildOwnerJourneyPayload,
  computeHousingSagaStage,
  type AggregatedUserForJourney,
  type HousingPaymentLike,
  type HousingUserLike,
} from "@/lib/owner-journey";
import {
  housingOwnerPaymentLookupStages,
  ownerJourneyUserLookupStages,
} from "@/lib/owner-journey/pipelines";
import { HousingUsers } from "@/models/housingUser";
import Users from "@/models/user";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";

export const dynamic = "force-dynamic";

const siteParam = z.enum(["vacationSaga", "holidaysera", "housingSaga"]);

type StageKey = 1 | 2 | 3 | 4;

function emptyStages(): Record<StageKey, number> {
  return { 1: 0, 2: 0, 3: 0, 4: 0 };
}

function cacheHeaders(): HeadersInit {
  return { "Cache-Control": "private, max-age=60" };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  let tokenPayload: unknown;
  try {
    tokenPayload = await getDataFromToken(request);
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const parsed = siteParam.safeParse(request.nextUrl.searchParams.get("site") ?? "");
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid or missing site query" },
      { status: 400 },
    );
  }

  await connectDb();

  const site = parsed.data;
  const hAdmin =
    typeof tokenPayload === "object" &&
    tokenPayload !== null &&
    "role" in tokenPayload &&
    (tokenPayload as { role?: string }).role === "HAdmin";

  const stages = emptyStages();

  if (site === "vacationSaga") {
    if (hAdmin) {
      return NextResponse.json(
        { success: true, stages },
        { headers: cacheHeaders() },
      );
    }

    const pipeline: PipelineStage[] = [
      {
        $match: {
          role: "Owner",
          $expr: {
            $not: {
              $regexMatch: {
                input: { $toString: { $ifNull: ["$origin", ""] } },
                regex: "^holidaysera$",
                options: "i",
              },
            },
          },
        },
      },
      ...ownerJourneyUserLookupStages(),
    ];

    const rows = await Users.aggregate(pipeline).allowDiskUse(true);
    for (const doc of rows) {
      const j = buildOwnerJourneyPayload(doc as unknown as AggregatedUserForJourney);
      const s = j.vacationSaga?.stage;
      if (s !== undefined) stages[s]++;
    }
  } else if (site === "holidaysera") {
    const pipeline: PipelineStage[] = [];

    if (hAdmin) {
      pipeline.push({
        $match: {
          role: "Owner",
          $expr: {
            $regexMatch: {
              input: { $toString: { $ifNull: ["$origin", ""] } },
              regex: "^holidaysera$",
              options: "i",
            },
          },
        },
      });
    } else {
      pipeline.push({ $match: { role: "Owner" } });
    }

    pipeline.push(...ownerJourneyUserLookupStages());

    if (!hAdmin) {
      pipeline.push({
        $match: {
          $or: [
            {
              $expr: {
                $regexMatch: {
                  input: { $toString: { $ifNull: ["$origin", ""] } },
                  regex: "^holidaysera$",
                  options: "i",
                },
              },
            },
            {
              $expr: {
                $gt: [{ $size: { $ifNull: ["$holidayUserMatch", []] } }, 0],
              },
            },
          ],
        },
      });
    }

    const rows = await Users.aggregate(pipeline).allowDiskUse(true);
    for (const doc of rows) {
      const j = buildOwnerJourneyPayload(doc as unknown as AggregatedUserForJourney);
      const s = j.holidaySera?.stage;
      if (s !== undefined) stages[s]++;
    }
  } else {
    const rows = await HousingUsers.aggregate([
      { $match: { role: "owner" } },
      ...housingOwnerPaymentLookupStages(),
    ]).allowDiskUse(true);

    for (const doc of rows) {
      const row = doc as HousingUserLike & { housingCapturedPayment?: HousingPaymentLike[] };
      const s = computeHousingSagaStage(row, row.housingCapturedPayment);
      if (s !== null) stages[s]++;
    }
  }

  return NextResponse.json({ success: true, stages }, { headers: cacheHeaders() });
}
