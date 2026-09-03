import { type NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { RescheduleVisitSchema } from "@/schemas/visit.schema";
import { rescheduleVisit } from "@/services/visits/visitService";
import { handleVisitServiceError } from "@/lib/visits/visitApiErrors";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const token = await getDataFromToken(req);
    const body = await req.json();
    const parsed = RescheduleVisitSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const visit = await rescheduleVisit({
      visitId: params.id,
      date: parsed.data.date,
      time: parsed.data.time,
      reason: parsed.data.reason,
      actor: {
        email: String(token.email),
        role: String(token.role),
      },
    });

    return NextResponse.json({ success: true, data: visit }, { status: 200 });
  } catch (error) {
    return handleVisitServiceError(error);
  }
}
