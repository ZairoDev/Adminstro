/**
 * Employee-related constants
 * Test accounts excluded from public employee lists and counts
 */

// Test SuperAdmin account - used for QA, not shown in employee lists
export const TEST_SUPERADMIN_EMAIL = "testingmail@gmail.com";
export const TEST_SUPERADMIN_PASSWORD = "125412";

/**
 * Exclude test account from employee list queries
 * @param query - The existing MongoDB query object
 * @returns Query object with test account email excluded
 */
export function excludeTestAccountFromQuery(query: any = {}): any {
  if (query.email && (query.email instanceof RegExp || (typeof query.email === 'object' && !query.email.$ne))) {
    const existingAnd = query.$and || [];
    const { email, ...restQuery } = query;
    return {
      ...restQuery,
      $and: [
        ...existingAnd,
        { email },
        { email: { $ne: TEST_SUPERADMIN_EMAIL } }
      ],
    };
  }
  if (!query.email) {
    return {
      ...query,
      email: { $ne: TEST_SUPERADMIN_EMAIL },
    };
  }
  if (query.email && typeof query.email === 'object' && query.email.$ne) {
    return {
      ...query,
      email: { ...query.email, $ne: TEST_SUPERADMIN_EMAIL },
    };
  }
  return {
    ...query,
    email: { $ne: TEST_SUPERADMIN_EMAIL },
  };
}

/**
 * Exclude test account from employee count queries
 * @param query - The existing MongoDB query object
 * @returns Query object with test account email excluded
 */
export function excludeTestAccountFromCount(query: any = {}): any {
  if (query.email && (query.email instanceof RegExp || (typeof query.email === 'object' && !query.email.$ne))) {
    const existingAnd = query.$and || [];
    const { email, ...restQuery } = query;
    return {
      ...restQuery,
      $and: [
        ...existingAnd,
        { email },
        { email: { $ne: TEST_SUPERADMIN_EMAIL } }
      ],
    };
  }
  if (!query.email) {
    return {
      ...query,
      email: { $ne: TEST_SUPERADMIN_EMAIL },
    };
  }
  if (query.email && typeof query.email === 'object' && query.email.$ne) {
    return {
      ...query,
      email: { ...query.email, $ne: TEST_SUPERADMIN_EMAIL },
    };
  }
  return {
    ...query,
    email: { $ne: TEST_SUPERADMIN_EMAIL },
  };
}
