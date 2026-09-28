import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import HousingCollaborator from "@/models/housingCollaborator";
import {
  generateCollaboratorPassword,
  hashCollaboratorPassword,
} from "@/lib/housingsaga/collaboratorAuth";

export const dynamic = "force-dynamic";

const STAFF_ROLES = ["SuperAdmin", "Admin", "HAdmin"] as const;

type RouteContext = { params: { id: string } | Promise<{ id: string }> };

async function resolveId(context: RouteContext): Promise<string> {
  const params = await context.params;
  return String(params?.id || "");
}

async function requireStaffAccess(request: NextRequest) {
  try {
    const auth = (await getDataFromToken(request)) as { role?: unknown } | null;
    const role = typeof auth?.role === "string" ? auth.role : "";
    if (!(STAFF_ROLES as readonly string[]).includes(role)) {
      return {
        ok: false as const,
        response: NextResponse.json(
          { success: false, error: "Insufficient permissions" },
          { status: 403 },
        ),
      };
    }
    return { ok: true as const, role };
  } catch (err: unknown) {
    const e = err as { status?: number; code?: string };
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          code: e?.code ?? "AUTH_FAILED",
          error: "Unauthorized",
        },
        { status: e?.status ?? 401 },
      ),
    };
  }
}

/** POST /api/housingsaga/collaborators/[id]/reset-password */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireStaffAccess(request);
    if (!auth.ok) return auth.response;

    const id = await resolveId(context);
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Collaborator id is required" },
        { status: 400 },
      );
    }

    await connectDb();

    let plainPassword = generateCollaboratorPassword();
    try {
      const body = await request.json();
      if (body?.password && String(body.password).trim().length >= 6) {
        plainPassword = String(body.password).trim();
      }
    } catch {
      // empty body → generate password
    }

    const hashedPassword = await hashCollaboratorPassword(plainPassword);

    const updated = await HousingCollaborator.findByIdAndUpdate(
      id,
      {
        $set: {
          password: hashedPassword,
          issuedPassword: plainPassword,
          tokenValidAfter: Date.now(),
          "webSession.sessionId": null,
          "webSession.sessionStartedAt": null,
          "webSession.expiresAt": null,
          "webSession.lastActiveAt": null,
          "webSession.isLoggedIn": false,
        },
      },
      { new: true },
    )
      .select("-password")
      .lean();

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Collaborator not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: updated,
      issuedPassword: plainPassword,
    });
  } catch (error) {
    console.error("[housingsaga/collaborators/reset-password] failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to reset password" },
      { status: 500 },
    );
  }
}
