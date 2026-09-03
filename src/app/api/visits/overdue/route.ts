import { type NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { getOverdueVisitsForUser } from "@/services/visits/visitService";
import { handleVisitServiceError } from "@/lib/visits/visitApiErrors";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const token = await getDataFromToken(req);
    const email = typeof token.email === "string" ? token.email : "";

    if (!email) {
      return NextResponse.json({ count: 0, visits: [] }, { status: 200 });
    }

    const visits = await getOverdueVisitsForUser(email);

    return NextResponse.json(
      { count: visits.length, visits },
      { status: 200 },
    );
  } catch (error) {
    return handleVisitServiceError(error);
  }
}
