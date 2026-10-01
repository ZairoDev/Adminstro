const HOUSING_SAGA_COLLABORATOR_STAFF_ROLES = ["SuperAdmin", "Admin", "HAdmin"] as const;

const HOUSING_SAGA_STAFF_EMAILS = ["siddartha@zairointernational.com"] as const;

export function isHousingSagaStaffEmail(email: unknown): boolean {
  const normalized = String(email ?? "").trim().toLowerCase();
  if (!normalized) return false;
  return (HOUSING_SAGA_STAFF_EMAILS as readonly string[]).includes(normalized);
}

export function canManageHousingCollaborators(
  role: unknown,
  email: unknown,
): boolean {
  const normalizedRole = String(role ?? "").trim();
  if (
    (HOUSING_SAGA_COLLABORATOR_STAFF_ROLES as readonly string[]).includes(
      normalizedRole,
    )
  ) {
    return true;
  }
  return isHousingSagaStaffEmail(email);
}
