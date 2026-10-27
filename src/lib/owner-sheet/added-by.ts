const PROTECTED_OWNER_SHEET_FIELDS = new Set([
  "addedByEmployeeId",
  "addedByName",
  "addedByEmail",
  "_id",
  "createdAt",
  "updatedAt",
  "__v",
]);

export function isProtectedOwnerSheetField(field: string): boolean {
  return PROTECTED_OWNER_SHEET_FIELDS.has(field);
}

export function ownerAddedByFromToken(token: {
  id?: unknown;
  name?: unknown;
  email?: unknown;
}): {
  addedByEmployeeId: string;
  addedByName: string;
  addedByEmail: string;
} {
  const email = String(token.email ?? "").trim().toLowerCase();
  const name = String(token.name ?? "").trim();
  return {
    addedByEmployeeId: String(token.id ?? "").trim(),
    addedByName: name || email || "Unknown",
    addedByEmail: email,
  };
}
