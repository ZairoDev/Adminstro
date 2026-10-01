import { NextResponse } from "next/server";
import {
  applyOwnerSheetLocationQuery,
  resolveOwnerSheetLocations,
} from "@/util/ownerSheetLocationFilter";

export const HOUSING_COLLABORATOR_OWNER_ROLE = "HCollaborator";

const SENSITIVE_OWNER_FIELDS = ["phoneNumber", "referenceLink", "address"] as const;

export function isHousingCollaboratorRole(role: unknown): boolean {
  return String(role ?? "") === HOUSING_COLLABORATOR_OWNER_ROLE;
}

export function collaboratorOwnerWriteForbidden(
  role: unknown,
): NextResponse | null {
  if (!isHousingCollaboratorRole(role)) return null;
  return NextResponse.json(
    { success: false, error: "Collaborators cannot edit the owner sheet" },
    { status: 403 },
  );
}

function toPlainOwner(owner: unknown): Record<string, unknown> {
  if (
    owner &&
    typeof owner === "object" &&
    "toObject" in owner &&
    typeof (owner as { toObject?: unknown }).toObject === "function"
  ) {
    return (owner as { toObject: () => Record<string, unknown> }).toObject();
  }
  return { ...(owner as Record<string, unknown>) };
}

export function redactOwnerContactFields<T>(owner: T): T {
  const next = toPlainOwner(owner);
  for (const field of SENSITIVE_OWNER_FIELDS) {
    delete next[field];
  }
  return next as T;
}

export function redactOwnerListForRole<T>(role: unknown, owners: T[]): T[] {
  if (!isHousingCollaboratorRole(role)) return owners;
  return owners.map((owner) => redactOwnerContactFields(owner));
}

/** Collaborators only see their allotted city. Other roles are unchanged. */
export function applyCollaboratorOwnerLocation(
  query: Record<string, unknown>,
  role: string,
  allotedArea: unknown,
  requestedPlace: unknown,
): { denyAll: boolean } {
  if (!isHousingCollaboratorRole(role)) return { denyAll: false };
  const { locations, denyAll } = resolveOwnerSheetLocations({
    role,
    tokenAllotedArea: allotedArea,
    requestedPlace,
    ownerBlocked: new Set<string>(),
  });
  if (denyAll) return { denyAll: true };
  applyOwnerSheetLocationQuery(query, locations);
  return { denyAll: false };
}
