import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import HousingCollaborator from "@/models/housingCollaborator";
import { getDataFromToken } from "@/util/getDataFromToken";
import {
  HOUSING_COLLABORATOR_ACCOUNT_TYPE,
  HOUSING_COLLABORATOR_ROLE,
} from "@/schemas/housingCollaborator.schema";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    let collaboratorId: string | undefined;
    let sessionId: string | undefined;

    try {
      const auth = (await getDataFromToken(request)) as {
        id?: string;
        sid?: string;
        role?: string;
        accountType?: string;
      };
      if (
        auth?.accountType === HOUSING_COLLABORATOR_ACCOUNT_TYPE ||
        auth?.role === HOUSING_COLLABORATOR_ROLE
      ) {
        collaboratorId = typeof auth.id === "string" ? auth.id : undefined;
        sessionId = typeof auth.sid === "string" ? auth.sid : undefined;
      }
    } catch {
      // Still clear cookies even if token is already invalid
    }

    if (collaboratorId) {
      await connectDb();
      await HousingCollaborator.updateOne(
        sessionId
          ? { _id: collaboratorId, "webSession.sessionId": sessionId }
          : { _id: collaboratorId },
        {
          $set: {
            "webSession.sessionId": null,
            "webSession.sessionStartedAt": null,
            "webSession.expiresAt": null,
            "webSession.lastActiveAt": null,
            "webSession.isLoggedIn": false,
          },
        },
      ).catch(() => undefined);
    }

    const response = NextResponse.json(
      { success: true, message: "Logged out" },
      { status: 200 },
    );
    response.cookies.set("token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    response.cookies.set("sessionId", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (error) {
    console.error("[housingsaga/logout] failed:", error);
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}
