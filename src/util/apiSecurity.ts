/**
 * API Security Utilities
 * Provides reusable functions for role and location-based access control in API routes
 */

export const LOCATION_EXEMPT_ROLES = [
  "SuperAdmin",
  "Admin",
  "Developer",
  "HR",
  "Sales-TeamLead",
  "LeadGen-TeamLead",
  "LeadGen",
  "Advert",
] as const;

/**
 * Check if a role is exempt from location filtering
 */
export function isLocationExempt(role: string): boolean {
  return LOCATION_EXEMPT_ROLES.includes(role as any);
}

/**
 * Check if role is admin level
 */
export function isAdminRole(role: string): boolean {
  return ["SuperAdmin", "Admin", "Developer"].includes(role);
}

/**
 * Check if role is Sales team (non-exempt)
 */
export function isSalesTeamRestricted(role: string): boolean {
  return role === "Sales" || role === "Subscription-Sales";
}

/**
 * Apply location filtering to a MongoDB query
 * @param query - The MongoDB query object to modify
 * @param role - User's role
 * @param assignedArea - User's assigned areas from token
 * @param requestedLocation - Optional location from request (must be validated)
 * @returns Modified query with location filtering applied
 */
export function applyLocationFilter(
  query: Record<string, any>,
  role: string,
  assignedArea: string | string[] | undefined,
  requestedLocation?: string | undefined
): Record<string, any> {
  // Exempt roles see all locations
  if (isLocationExempt(role) || isAdminRole(role)) {
    // If a specific location is requested and user is exempt, allow it
    if (requestedLocation && requestedLocation !== "All") {
      query.location = new RegExp(requestedLocation, "i");
    }
    return query;
  }

  // For restricted Sales users, enforce location filtering
  if (isSalesTeamRestricted(role)) {
    // Validate requested location against assigned areas
    if (requestedLocation && requestedLocation !== "All") {
      const normalizedRequested = requestedLocation.toLowerCase();
      const userAreas = Array.isArray(assignedArea)
        ? assignedArea.map((a) => a.toLowerCase())
        : assignedArea
        ? [assignedArea.toLowerCase()]
        : [];

      // Only allow if requested location is in user's assigned areas
      if (userAreas.includes(normalizedRequested)) {
        query.location = new RegExp(requestedLocation, "i");
      } else {
        // Security: Requested location not in user's areas - deny access
        query.location = { $in: [] }; // Empty array returns no results
      }
    } else {
      // No specific location requested - filter by all assigned areas
      // Use case-insensitive regex matching for location field
      if (assignedArea) {
        if (Array.isArray(assignedArea) && assignedArea.length > 0) {
          // For array of locations, use $or with regex for case-insensitive matching
          query.$or = assignedArea.map((area) => ({
            location: new RegExp(`^${area}$`, "i") // Exact match (case-insensitive)
          }));
        } else if (typeof assignedArea === "string") {
          // Single location - use case-insensitive regex for exact match
          query.location = new RegExp(`^${assignedArea}$`, "i");
        }
      } else {
        // No assigned areas - deny access
        query.location = { $in: [] };
      }
    }
  }

  return query;
}

/**
 * Validate that a requested location is within user's assigned areas
 * @param requestedLocation - Location from request
 * @param assignedArea - User's assigned areas
 * @param role - User's role
 * @returns true if location is valid for this user
 */
export function validateLocationAccess(
  requestedLocation: string,
  assignedArea: string | string[] | undefined,
  role: string
): boolean {
  if (isLocationExempt(role) || isAdminRole(role)) {
    return true;
  }

  if (!assignedArea) {
    return false;
  }

  const normalizedRequested = requestedLocation.toLowerCase();
  const userAreas = Array.isArray(assignedArea)
    ? assignedArea.map((a) => a.toLowerCase())
    : [assignedArea.toLowerCase()];

  return userAreas.includes(normalizedRequested);
}

/**
 * Check if user can access a specific dashboard section
 */
export function canAccessSection(
  role: string,
  section: string
): boolean {
  // This should match the logic in dashboardConfig.ts
  // For now, basic implementation
  if (isAdminRole(role)) {
    return true;
  }

  // Add more specific checks based on section and role
  // This is a simplified version - full implementation should use dashboardConfig
  return false;
}

