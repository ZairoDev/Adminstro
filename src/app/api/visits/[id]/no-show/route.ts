import { type NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { NoShowVisitSchema } from "@/schemas/visit.schema";
import { noShowVisit } from "@/services/visits/visitService";
import { handleVisitServiceError } from "@/lib/visits/visitApiErrors";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const token = await getDataFromToken(req);
    const body = await req.json();
    const parsed = NoShowVisitSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const visit = await noShowVisit({
      visitId: params.id,
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
