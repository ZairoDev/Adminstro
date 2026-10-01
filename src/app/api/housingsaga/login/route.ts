import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import HousingCollaborator from "@/models/housingCollaborator";
import {
  compareCollaboratorPassword,
} from "@/lib/housingsaga/collaboratorAuth";
import {
  HOUSING_COLLABORATOR_ACCOUNT_TYPE,
  HOUSING_COLLABORATOR_ROLE,
  housingCollaboratorLoginSchema,
} from "@/schemas/housingCollaborator.schema";
import { WEB_SESSION_DURATION_MS } from "@/util/deviceSession";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await connectDb();
    const body = await request.json();
    const parsed = housingCollaboratorLoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 },
      );
    }

    const email = parsed.data.email.toLowerCase().trim();
    const password = parsed.data.password;

    const collaborator = await HousingCollaborator.findOne({ email }).select(
      "+password name email isActive webSession allotedArea",
    );

    if (!collaborator || collaborator.isActive === false) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    const valid = await compareCollaboratorPassword(
      password,
      collaborator.password,
    );
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    const tokenSecret = process.env.TOKEN_SECRET;
    if (!tokenSecret) {
      return NextResponse.json(
        { error: "Server misconfiguration" },
        { status: 500 },
      );
    }

    const sessionId = randomUUID();
    const now = Date.now();
    const expiresAt = now + WEB_SESSION_DURATION_MS;

    await HousingCollaborator.updateOne(
      { _id: collaborator._id },
      {
        $set: {
          "webSession.sessionId": sessionId,
          "webSession.sessionStartedAt": now,
          "webSession.expiresAt": expiresAt,
          "webSession.lastActiveAt": now,
          "webSession.isLoggedIn": true,
        },
      },
    );

    const tokenPayload = {
      id: String(collaborator._id),
      sid: sessionId,
      name: collaborator.name,
      email: collaborator.email,
      role: HOUSING_COLLABORATOR_ROLE,
      accountType: HOUSING_COLLABORATOR_ACCOUNT_TYPE,
      allotedArea: Array.isArray(collaborator.allotedArea)
        ? collaborator.allotedArea
        : [],
    };

    const token = jwt.sign(tokenPayload, tokenSecret, { expiresIn: "12h" });

    const response = NextResponse.json(
      {
        message: "Login successful",
        token,
        tokenData: tokenPayload,
      },
      { status: 200 },
    );

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
    response.cookies.set("sessionId", sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[housingsaga/login] failed:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
