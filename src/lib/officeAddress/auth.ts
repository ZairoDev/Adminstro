import { NextRequest, NextResponse } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";

const OFFICE_ADDRESS_MANAGE_ROLES = ["SuperAdmin", "Admin", "HR", "HAdmin"] as const;

export type OfficeAddressAuth =
  | { ok: true; role: string; id?: string }
  | { ok: false; response: NextResponse };

export async function requireOfficeAddressManager(
  request: NextRequest,
): Promise<OfficeAddressAuth> {
  let auth: { role?: unknown; id?: unknown } | null = null;
  try {
    auth = (await getDataFromToken(request)) as {
      role?: unknown;
      id?: unknown;
    } | null;
  } catch (err: unknown) {
    const e = err as { status?: number; code?: string };
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, code: e?.code ?? "AUTH_FAILED", error: "Unauthorized" },
        { status: e?.status ?? 401 },
      ),
    };
  }

  const role = typeof auth?.role === "string" ? auth.role : "";
  if (!(OFFICE_ADDRESS_MANAGE_ROLES as readonly string[]).includes(role)) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 },
      ),
    };
  }

  return {
    ok: true,
    role,
    id: typeof auth?.id === "string" ? auth.id : undefined,
  };
}
