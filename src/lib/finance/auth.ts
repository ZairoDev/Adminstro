import { NextRequest } from "next/server";
import { getDataFromToken } from "@/util/getDataFromToken";

export const FINANCE_WRITE_ROLES = [
  "SuperAdmin",
  "Sales",
  "LeadGen",
] as const;

export type FinanceAuthPayload = {
  id?: string;
  name?: string;
  role?: string;
  email?: string;
};

export async function requireFinanceAccess(
  request: NextRequest,
): Promise<FinanceAuthPayload> {
  const payload = (await getDataFromToken(request)) as FinanceAuthPayload;
  const role = payload.role ?? "";
  if (!FINANCE_WRITE_ROLES.includes(role as (typeof FINANCE_WRITE_ROLES)[number])) {
    throw { status: 403, code: "FORBIDDEN", message: "Finance access required" };
  }
  return payload;
}

export function financeAuthErrorResponse(error: unknown): {
  status: number;
  body: { success: false; code?: string; message: string };
} {
  if (
    error &&
    typeof error === "object" &&
    "status" in error &&
    typeof (error as { status: unknown }).status === "number"
  ) {
    const e = error as { status: number; code?: string; message?: string };
    return {
      status: e.status,
      body: {
        success: false,
        code: e.code,
        message: e.message ?? "Unauthorized",
      },
    };
  }
  return {
    status: 401,
    body: { success: false, code: "UNAUTHORIZED", message: "Unauthorized" },
  };
}
