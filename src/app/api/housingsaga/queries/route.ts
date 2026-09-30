import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import { housingSagaQuerySchema } from "@/schemas/housingSagaQuery.schema";
import { getLeadGenEmployeeEmails } from "@/lib/leads/leadGenEmailCache";
import {
  createHousingSagaQuery,
  listHousingSagaQueries,
} from "@/services/housingsaga/housingSagaQuery";

export const dynamic = "force-dynamic";

const ALL_LEADS_ROLES = ["SuperAdmin", "Admin", "HAdmin"] as const;

type AuthResult =
  | { ok: true; role: string; email: string }
  | { ok: false; response: NextResponse };

async function requireAuth(request: NextRequest): Promise<AuthResult> {
  try {
    const auth = (await getDataFromToken(request)) as {
      role?: unknown;
      email?: unknown;
    } | null;
    const role = typeof auth?.role === "string" ? auth.role : "";
    const email = typeof auth?.email === "string" ? auth.email : "";
    if (!role) {
      return {
        ok: false,
        response: NextResponse.json(
          { success: false, error: "Unauthorized" },
          { status: 401 },
        ),
      };
    }
    return { ok: true, role, email };
  } catch (err: unknown) {
    const error = err as { status?: number; code?: string };
    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          code: error?.code ?? "AUTH_FAILED",
          error: "Unauthorized",
        },
        { status: error?.status ?? 401 },
      ),
    };
  }
}

/** GET /api/housingsaga/queries */
export async function GET(request: NextRequest) {
  const access = await requireAuth(request);
  if (!access.ok) return access.response;

  try {
    await connectDb();
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page") || "1") || 1);
    const limit = Math.min(
      50,
      Math.max(1, Number(searchParams.get("limit") || "12") || 12),
    );

    let createdBy: string | string[] | undefined;
    if (access.role === "LeadGen-TeamLead") {
      const leadGenEmails = await getLeadGenEmployeeEmails();
      createdBy = Array.from(
        new Set(
          [...leadGenEmails, access.email]
            .map((email) => email.trim().toLowerCase())
            .filter(Boolean),
        ),
      );
    } else if (!(ALL_LEADS_ROLES as readonly string[]).includes(access.role)) {
      createdBy = access.email;
    }

    const result = await listHousingSagaQueries({ createdBy, page, limit });

    return NextResponse.json({
      success: true,
      data: result.data,
      total: result.total,
      totalPages: result.totalPages,
      page,
    });
  } catch (error) {
    console.error("[housingsaga/queries] GET failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch Housing Saga leads" },
      { status: 500 },
    );
  }
}

/** POST /api/housingsaga/queries */
export async function POST(request: NextRequest) {
  const access = await requireAuth(request);
  if (!access.ok) return access.response;

  if (!access.email) {
    return NextResponse.json(
      { success: false, error: "Account email is required to create a lead" },
      { status: 400 },
    );
  }

  try {
    const body: unknown = await request.json();
    const parsed = housingSagaQuerySchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message || "Invalid lead details";
      return NextResponse.json(
        { success: false, error: message },
        { status: 400 },
      );
    }

    await connectDb();
    const result = await createHousingSagaQuery(parsed.data, access.email);
    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.status },
      );
    }

    return NextResponse.json(
      { success: true, data: result.data },
      { status: 201 },
    );
  } catch (error) {
    console.error("[housingsaga/queries] POST failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create Housing Saga lead" },
      { status: 500 },
    );
  }
}
