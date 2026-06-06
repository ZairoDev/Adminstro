import { NextResponse } from "next/server";

import Employees from "@/models/employee";
import {
  assertOwnerSheetApiAccess,
  applyRentalTypeToLeadQuery,
  resolveEmployeeRentalType,
  type EmployeeRentalType,
  type OwnerSheetVariant,
} from "@/util/employeeRentalTypeAccess";

type AuthToken = {
  id?: unknown;
  rentalType?: unknown;
  role?: unknown;
};

function asAuthToken(token: unknown): AuthToken {
  return (token ?? {}) as AuthToken;
}

export async function getResolvedEmployeeRentalType(
  token: unknown,
): Promise<EmployeeRentalType | null> {
  const auth = asAuthToken(token);
  const employeeId = String(auth.id ?? "").trim();
  let dbRentalType: unknown;

  if (employeeId) {
    const doc = await Employees.findById(employeeId).select("rentalType").lean();
    dbRentalType = (doc as { rentalType?: unknown } | null)?.rentalType;
  }

  return resolveEmployeeRentalType(auth.rentalType, dbRentalType);
}

export async function enforceOwnerSheetRentalTypeAccess(
  token: unknown,
  variant: OwnerSheetVariant,
): Promise<NextResponse | null> {
  const auth = asAuthToken(token);
  const rentalType = await getResolvedEmployeeRentalType(auth);
  const check = assertOwnerSheetApiAccess(
    rentalType,
    String(auth.role ?? ""),
    variant,
  );

  if (check.allowed) {
    return null;
  }

  return NextResponse.json(
    { success: false, message: check.message },
    { status: 403 },
  );
}

export async function applyEmployeeRentalTypeLeadFilter(
  query: Record<string, unknown>,
  token: unknown,
): Promise<Record<string, unknown>> {
  const auth = asAuthToken(token);
  const rentalType = await getResolvedEmployeeRentalType(auth);
  return applyRentalTypeToLeadQuery(query, rentalType, String(auth.role ?? ""));
}
