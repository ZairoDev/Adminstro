import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/util/db";
import { getDataFromToken } from "@/util/getDataFromToken";
import HousingCollaborator from "@/models/housingCollaborator";
import Employees from "@/models/employee";
import { housingCollaboratorSchema } from "@/schemas/housingCollaborator.schema";
import {
  hashCollaboratorPassword,
  toStaffCollaboratorView,
} from "@/lib/housingsaga/collaboratorAuth";
import { normalizeAllotedArea } from "@/util/location";
import { canManageHousingCollaborators } from "@/util/housingSagaStaff";

export const dynamic = "force-dynamic";

async function requireStaffAccess(request: NextRequest) {
  try {
    const auth = (await getDataFromToken(request)) as {
      role?: unknown;
      email?: unknown;
      id?: unknown;
    } | null;
    const role = typeof auth?.role === "string" ? auth.role : "";
    const email = typeof auth?.email === "string" ? auth.email : "";
    if (!canManageHousingCollaborators(role, email)) {
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

/** GET /api/housingsaga/collaborators — staff only */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireStaffAccess(request);
    if (!auth.ok) return auth.response;

    await connectDb();

    const { searchParams } = request.nextUrl;
    const search = String(searchParams.get("search") || "").trim();
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || 20)));
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};
    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      query.$or = [
        { name: regex },
        { firstName: regex },
        { lastName: regex },
        { email: regex },
        { contact: regex },
        { country: regex },
        { city: regex },
        { area: regex },
      ];
    }

    const [collaborators, total] = await Promise.all([
      HousingCollaborator.find(query)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      HousingCollaborator.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: collaborators.map((doc) =>
        toStaffCollaboratorView(doc as Record<string, unknown>),
      ),
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    console.error("[housingsaga/collaborators] GET failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch collaborators" },
      { status: 500 },
    );
  }
}

/** POST /api/housingsaga/collaborators — staff only */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireStaffAccess(request);
    if (!auth.ok) return auth.response;

    await connectDb();
    const body = await request.json();
    const parsed = housingCollaboratorSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || "Invalid input",
        },
        { status: 400 },
      );
    }

    const {
      firstName,
      lastName,
      contact,
      email,
      country,
      city,
      area,
      allotedArea,
      supplies,
      sendContractViaEmail,
      password,
    } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    const [existingCollaborator, existingEmployee] = await Promise.all([
      HousingCollaborator.findOne({ email: normalizedEmail }).select("_id"),
      Employees.findOne({ email: normalizedEmail }).select("_id"),
    ]);

    if (existingCollaborator) {
      return NextResponse.json(
        { success: false, error: "A collaborator with this email already exists" },
        { status: 400 },
      );
    }
    if (existingEmployee) {
      return NextResponse.json(
        {
          success: false,
          error: "This email is already used by an organization employee",
        },
        { status: 400 },
      );
    }

    const hashedPassword = await hashCollaboratorPassword(password);
    const normalizedAllotedArea = normalizeAllotedArea(allotedArea);
    if (normalizedAllotedArea.length === 0) {
      return NextResponse.json(
        { success: false, error: "Alloted area is required" },
        { status: 400 },
      );
    }

    const collaborator = await HousingCollaborator.create({
      firstName,
      lastName,
      contact,
      email: normalizedEmail,
      country,
      city,
      area,
      allotedArea: normalizedAllotedArea,
      supplies,
      sendContractViaEmail: Boolean(sendContractViaEmail),
      password: hashedPassword,
      issuedPassword: password,
      isActive: true,
    });

    const plain = collaborator.toObject() as unknown as Record<string, unknown>;
    delete plain.password;

    return NextResponse.json(
      { success: true, data: plain },
      { status: 201 },
    );
  } catch (error) {
    console.error("[housingsaga/collaborators] POST failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create collaborator" },
      { status: 500 },
    );
  }
}
