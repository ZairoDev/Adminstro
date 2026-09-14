import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";


import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { forceLogoutEmployee } from "@/lib/employee/forceLogoutEmployee";

connectDb();

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  employeeId: z.string().min(1),
  sessionId: z.string().optional(),
  reason: z.string().max(100).optional(),
  message: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Authenticate and authorize caller using shared token logic
    let auth: { id?: string; role?: string; name?: string };
    try {
      auth = (await getDataFromToken(request)) as unknown as {
        id?: string;
        role?: string;
        name?: string;
      };
    } catch (err: unknown) {
      const status =
        (typeof err === "object" &&
          err !== null &&
          "status" in err &&
          typeof (err as { status?: unknown }).status === "number" &&
          (err as { status: number }).status) ||
        401;
      const code =
        (typeof err === "object" &&
          err !== null &&
          "code" in err &&
          typeof (err as { code?: unknown }).code === "string" &&
          (err as { code: string }).code) ||
        "AUTH_FAILED";
      return NextResponse.json(
        { success: false, code, message: "Unauthorized" },
        { status },
      );
    }

    const role = auth?.role as string | undefined;
    const allowedRoles = ["SuperAdmin", "Admin", "HR", "Developer", "HAdmin"];
    if (!role || !allowedRoles.includes(role)) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid request body",
          errors: parsed.error.format(),
        },
        { status: 400 },
      );
    }

   const { employeeId, sessionId, reason, message } = parsed.data;

    // Hard-block invalid targets before any DB work
    if (auth?.id && auth.id === employeeId) {
      return NextResponse.json(
        { success: false, message: "You cannot force logout yourself." },
        { status: 403 },
      );
    }

    // Test SuperAdmin is token-only (no DB record) and must never be force-logged out
    if (employeeId === "test-superadmin") {
      return NextResponse.json(
        { success: false, message: "SuperAdmin cannot be force logged out." },
        { status: 403 },
      );
    }

       const result = await forceLogoutEmployee(employeeId, {
      actorName: auth.name || "Unknown",
      actorRole: auth.role || "Unknown",
      sessionId,
      reason,
      message,
    });

  if (!result.success) {
      const status = result.message === "Employee not found" ? 404 : 403;
      return NextResponse.json(
               { success: false, message: result.message },
        { status },
      );
    }

    
    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    console.error("Force logout error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
