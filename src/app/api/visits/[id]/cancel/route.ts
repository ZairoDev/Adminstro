import { type NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";
import { CancelVisitSchema } from "@/schemas/visit.schema";
import { cancelVisit } from "@/services/visits/visitService";
import { handleVisitServiceError } from "@/lib/visits/visitApiErrors";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const token = await getDataFromToken(req);
    const body = await req.json();
    const parsed = CancelVisitSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const visit = await cancelVisit({
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
